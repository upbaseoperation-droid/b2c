/**
 * Đo giao diện trên trang thật (UI_SYNC_PLAN.md §6, lớp 3). Là MỘT biểu thức JavaScript chạy trong trang:
 * dán vào console, hoặc để run.mjs / bất kỳ trình điều khiển trình duyệt nào tự đánh giá (evaluate).
 * Chỉ đọc DOM, không sửa gì. Trả về { viewport, counts, issues } (issues có tối đa 8 mẫu cho mỗi luật).
 *
 * Luật:
 *  - lech-hang      ô cùng hàng (cùng dòng nhãn) nhưng ô nhập lệch nhau quá 2px
 *  - o-hep          ô nhập hẹp hơn 85% cột chứa nó
 *  - chu-bi-cat     chữ bị cắt (ellipsis hoặc tràn bị ẩn) mà không có tooltip (title)
 *  - chu-nho        chữ dưới 12px, trừ vùng <Density> (data-density)
 *  - nhan-danh-so   nhãn nút/tab/cột bắt đầu bằng số thứ tự hoặc "Bước N"
 *  - chu-thich      đoạn chữ phụ nằm ngay dưới tiêu đề khối
 *  - tran-ngang     trang cuộn ngang (chỉ nghiêm trọng ở 375px)
 */
(() => {
  const MAX_SAMPLES = 8;
  const issues = {};
  const counts = {};
  const add = (rule, el, detail) => {
    counts[rule] = (counts[rule] || 0) + 1;
    const list = (issues[rule] ||= []);
    if (list.length >= MAX_SAMPLES) return;
    const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    list.push({ text, tag: el.tagName.toLowerCase(), ...detail });
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const inDensity = (el) => !!el.closest('[data-density]');
  const root = document.querySelector('main') || document.body;

  // Ô nhập hiển thị. <Select> vẽ bằng nút data-select-root; <select> thật chỉ là bản ẩn (sr-only).
  const controls = [...root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), textarea, [data-select-root]')].filter(visible);

  // Một ô "đứng trong Field": cha trực tiếp (hoặc cha của wrapper) có <label> ngay trước nó.
  const fieldOf = (c) => {
    for (let p = c.parentElement, depth = 0; p && depth < 3; p = p.parentElement, depth++) {
      const label = [...p.children].find((k) => k.tagName === 'LABEL' && visible(k));
      if (label) return { field: p, label };
    }
    return null;
  };

  const rows = [];
  for (const c of controls) {
    const f = fieldOf(c);
    if (!f) continue;
    const cr = c.getBoundingClientRect();
    const lr = f.label.getBoundingClientRect();
    const fr = f.field.getBoundingClientRect();
    rows.push({ c, f, cTop: cr.top, lTop: lr.top, container: f.field.parentElement });

    // o-hep: chỉ xét khi cả cột là một Field (một nhãn + ô), không xét ô nằm cạnh nút trong cùng hàng.
    const colW = fr.width;
    const inlineSiblings = [...f.field.children].filter((k) => k !== f.label && visible(k) && k.getBoundingClientRect().top < cr.bottom && k.getBoundingClientRect().bottom > cr.top && k !== c && !k.contains(c) && !c.contains(k));
    if (colW > 120 && inlineSiblings.length === 0 && cr.width < colW * 0.85) {
      add('o-hep', c, { width: Math.round(cr.width), column: Math.round(colW) });
    }
  }

  // lech-hang: các Field cùng container, cùng dòng nhãn (±2px) mà ô nhập lệch quá 2px.
  const byContainer = new Map();
  for (const r of rows) (byContainer.get(r.container) || byContainer.set(r.container, []).get(r.container)).push(r);
  for (const list of byContainer.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.f.field === b.f.field) continue;
        if (Math.abs(a.lTop - b.lTop) <= 2 && Math.abs(a.cTop - b.cTop) > 2) {
          add('lech-hang', b.c, { delta: Math.round(Math.abs(a.cTop - b.cTop)) });
        }
      }
    }
  }

  // chu-nho, chu-bi-cat, nhan-danh-so: duyệt phần tử có chữ trực tiếp.
  const NUMBERED = /^\s*(?:\d{1,2}\.\s+\S|Bước\s*\d)/;
  for (const el of root.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();

    if (ownText) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 11.95 && !inDensity(el)) add('chu-nho', el, { fontSize: +fs.toFixed(1) });
      if (NUMBERED.test(ownText) && el.closest('button, [role=tab], th, [role=columnheader]')) add('nhan-danh-so', el, {});
    }

    const s = getComputedStyle(el);
    const clipped = el.scrollWidth > el.clientWidth + 1;
    const hides = s.overflowX === 'hidden' || s.overflowX === 'clip' || s.textOverflow === 'ellipsis';
    if (clipped && hides && ownText && !el.getAttribute('title') && !el.closest('[title]')) {
      add('chu-bi-cat', el, { scroll: el.scrollWidth, client: el.clientWidth });
    }
  }

  // chu-thich: tiêu đề khối (h2/h3/h4) theo sau bởi đoạn chữ phụ xám dài, không có phần tử con.
  for (const h of root.querySelectorAll('h2, h3, h4')) {
    if (!visible(h) || inDensity(h)) continue;
    const next = h.nextElementSibling;
    if (!next || !visible(next) || !['P', 'DIV', 'SPAN'].includes(next.tagName) || next.children.length) continue;
    const t = (next.innerText || '').trim();
    const cls = typeof next.className === 'string' ? next.className : '';
    if (t.length >= 40 && t.length <= 300 && /text-ink-[23]/.test(cls)) add('chu-thich', next, {});
  }

  const docOverflow = document.documentElement.scrollWidth - window.innerWidth;
  if (docOverflow > 1) add('tran-ngang', document.documentElement, { by: docOverflow });

  return { viewport: { w: window.innerWidth, h: window.innerHeight }, counts, issues };
})();
