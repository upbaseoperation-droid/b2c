import React from 'react';
import {
  AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { loadFont } from '@remotion/google-fonts/BeVietnamPro';
import shotsJson from './shots.json';

const { fontFamily: FONT } = loadFont('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
});

// ---------- hằng số bố cục ----------
const W = 1920;
const H = 1080;
const BRAND = '#E5322D';
const FW = 1240; // bề rộng khung trình duyệt
const K = FW / W; // tỉ lệ ảnh chụp -> khung
const FH = H * K;
const CH = 44; // thanh tiêu đề trình duyệt
const FX = 600;
const FY = 150;
const TOTAL_STEPS = 12;

const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

type Rect = { x: number; y: number; w: number; h: number };
type Shot = { rows: Rect[]; target?: Rect | null; search?: Rect; addBtn?: Rect; dialog?: Rect; nameInput?: Rect; createBtn?: Rect };
const SH = shotsJson as unknown as Record<string, Shot>;
const src = (id: string) => staticFile(`shots/${id}.png`);
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---------- nội suy keyframe ----------
type CamKey = { f: number; z: number; x: number; y: number };
type CurKey = { f: number; x: number; y: number };

function track<T extends { f: number }>(frame: number, keys: T[], prop: keyof T) {
  const vs = keys.map((k) => k[prop] as unknown as number);
  if (keys.length === 1) return vs[0];
  return interpolate(frame, keys.map((k) => k.f), vs, { ...cl, easing: ease });
}

// con trỏ đi theo đường cong nhẹ giữa các điểm
function cursorAt(frame: number, keys: CurKey[]) {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame < b.f) {
      const t = ease((frame - a.f) / (b.f - a.f));
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = Math.sin(Math.PI * t) * Math.min(90, len * 0.18);
      return { x: a.x + dx * t + (-dy / len) * off, y: a.y + dy * t + (dx / len) * off };
    }
  }
  return keys[keys.length - 1];
}

// ---------- nền động toàn video ----------
const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const blob = (color: string, x: number, y: number, r: number, sp: number, ph: number) => (
    <div style={{
      position: 'absolute', width: r * 2, height: r * 2, borderRadius: '50%', background: color, filter: 'blur(150px)',
      left: x - r + Math.sin(f / sp + ph) * 160, top: y - r + Math.cos(f / (sp * 1.3) + ph) * 120,
    }} />
  );
  return (
    <AbsoluteFill style={{ background: '#0b0b10', overflow: 'hidden' }}>
      {blob('rgba(229,50,45,0.42)', 300, 250, 420, 70, 0)}
      {blob('rgba(109,91,255,0.30)', 1600, 850, 480, 90, 2)}
      {blob('rgba(255,159,67,0.20)', 1300, 120, 360, 60, 4)}
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '64px 64px', backgroundPosition: `${(f * 0.4) % 64}px ${(f * 0.4) % 64}px`,
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }} />
    </AbsoluteFill>
  );
};

// ---------- logo ----------
const Logo: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.28 }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.26, background: `linear-gradient(135deg, ${BRAND}, #ff6a4d)`,
      display: 'grid', placeItems: 'center', fontSize: size * 0.58, fontWeight: 800, color: '#fff', boxShadow: '0 10px 30px rgba(229,50,45,.45)',
    }}>U</div>
    <span style={{ fontSize: size * 0.74, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>upbase</span>
  </div>
);

// ---------- chữ xuất hiện từng từ ----------
const Words: React.FC<{ text: string; start: number; size: number; weight?: number; color?: string; gap?: number }> = ({ text, start, size, weight = 800, color = '#fff', gap = 3 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span>
      {text.split(' ').map((w, i) => {
        const p = spring({ frame: f - start - i * gap, fps, config: { damping: 15, mass: 0.7 } });
        return (
          <span key={i} style={{
            display: 'inline-block', marginRight: size * 0.25, fontSize: size, fontWeight: weight, color,
            opacity: p, transform: `translateY(${(1 - p) * size * 0.6}px)`, filter: `blur(${(1 - p) * 10}px)`,
          }}>{w}</span>
        );
      })}
    </span>
  );
};

const Counter: React.FC<{ n: number; start: number; dur?: number; style?: React.CSSProperties }> = ({ n, start, dur = 40, style }) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [start, start + dur], [0, n], { ...cl, easing: Easing.out(Easing.cubic) }));
  return <span style={style}>{v.toLocaleString('vi-VN')}</span>;
};

// ---------- panel chữ bên trái ----------
const TextPanel: React.FC<{ step: number; title: string; body: string; chip?: { n: number; label: string }; dur: number }> = ({ step, title, body, chip, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = spring({ frame: f - 4, fps, config: { damping: 18 } });
  const bodyP = spring({ frame: f - 22, fps, config: { damping: 18 } });
  const chipP = spring({ frame: f - 34, fps, config: { damping: 13 } });
  const prog = interpolate(f, [0, dur], [0, 1], cl);
  return (
    <div style={{ position: 'absolute', left: 90, top: 0, bottom: 0, width: 470, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 40 * bar, height: 4, borderRadius: 2, background: BRAND }} />
        <span style={{ color: '#ff8a80', fontSize: 19, fontWeight: 700, letterSpacing: 3, opacity: bar }}>
          BƯỚC {String(step).padStart(2, '0')} / {TOTAL_STEPS}
        </span>
      </div>
      <div style={{ lineHeight: 1.12 }}><Words text={title} start={8} size={56} /></div>
      <div style={{ marginTop: 26, fontSize: 23, lineHeight: 1.55, color: 'rgba(255,255,255,.74)', opacity: bodyP, transform: `translateY(${(1 - bodyP) * 18}px)` }}>
        {body}
      </div>
      {chip && (
        <div style={{
          marginTop: 34, alignSelf: 'flex-start', display: 'flex', alignItems: 'baseline', gap: 14, padding: '14px 24px', borderRadius: 18,
          background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
          opacity: chipP, transform: `scale(${0.8 + 0.2 * chipP})`, transformOrigin: 'left center',
        }}>
          <Counter n={chip.n} start={36} style={{ fontSize: 60, fontWeight: 800, background: `linear-gradient(135deg,#fff, #ff9b8f)`, WebkitBackgroundClip: 'text', color: 'transparent' }} />
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>{chip.label}</span>
        </div>
      )}
      {/* thanh tiến độ các bước */}
      <div style={{ position: 'absolute', bottom: 96, left: 0, display: 'flex', gap: 6 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ width: 30, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${i < step - 1 ? 100 : i === step - 1 ? prog * 100 : 0}%`, background: i === step - 1 ? BRAND : 'rgba(255,255,255,.85)' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- khung trình duyệt 3D ----------
const Frame3D: React.FC<{ children: React.ReactNode; overlay?: React.ReactNode; dim?: number }> = ({ children, overlay, dim = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 20, mass: 0.9 } });
  const ry = interpolate(p, [0, 1], [-18, -6]) + Math.sin(f / 45) * 1.1;
  const rx = interpolate(p, [0, 1], [8, 2.5]) + Math.cos(f / 60) * 0.6;
  return (
    <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: '20% 50%' }}>
      <div style={{
        position: 'absolute', left: FX, top: FY, width: FW, height: FH + CH, transformStyle: 'preserve-3d',
        transform: `translateX(${(1 - p) * 140}px) rotateY(${ry}deg) rotateX(${rx}deg)`,
        borderRadius: 14, background: '#fff', boxShadow: '0 50px 120px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)',
      }}>
        <div style={{ height: CH, borderRadius: '14px 14px 0 0', background: '#ececf0', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />)}
          <div style={{ marginLeft: 22, flex: 1, maxWidth: 520, height: 26, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 14, color: '#666' }}>
            Upbase Ops · Dữ liệu gốc
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, top: CH, width: FW, height: FH, overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
          {children}
          <div style={{ position: 'absolute', inset: 0, background: `rgba(8,8,16,${dim})` }} />
        </div>
        {overlay}
      </div>
    </AbsoluteFill>
  );
};

// ---------- con trỏ / gợn sóng / khung nhấn mạnh (toạ độ ảnh chụp) ----------
const Cursor: React.FC<{ x: number; y: number; z: number; press: number; opacity: number }> = ({ x, y, z, press, opacity }) => {
  const s = (1.45 / z) * (1 - press * 0.18);
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" style={{
      position: 'absolute', left: x - 5, top: y - 2, opacity, transform: `scale(${s})`, transformOrigin: '5px 2px',
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.4))',
    }}>
      <path d="M5 2 L5 20 L9.5 15.5 L12.5 22 L15.5 20.7 L12.5 14.3 L19 14.3 Z" fill="#111" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};

const Ripple: React.FC<{ at: number; x: number; y: number; z: number }> = ({ at, x, y, z }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 22], [0, 1], cl);
  if (f < at || t >= 1) return null;
  const r = (70 / z) * (0.25 + t);
  return (
    <>
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${4 / z}px solid ${BRAND}`, opacity: 1 - t }} />
      <div style={{ position: 'absolute', left: x - r / 2, top: y - r / 2, width: r, height: r, borderRadius: '50%', background: BRAND, opacity: (1 - t) * 0.3 }} />
    </>
  );
};

const Highlight: React.FC<{ rect: Rect; from: number; to?: number }> = ({ rect, from, to = 9999 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - from, fps, config: { damping: 12 } }) * interpolate(f, [to, to + 8], [1, 0], cl);
  const pulse = 0.5 + 0.5 * Math.sin((f - from) / 6);
  return (
    <div style={{
      position: 'absolute', left: rect.x - 8, top: rect.y - 6, width: rect.w + 16, height: rect.h + 12, borderRadius: 10,
      border: `3px solid ${BRAND}`, opacity: p, transform: `scale(${1.15 - 0.15 * p})`,
      boxShadow: `0 0 ${18 + pulse * 18}px rgba(229,50,45,.55), inset 0 0 0 9999px rgba(229,50,45,.06)`,
    }} />
  );
};

// ---------- dòng dữ liệu "nhấc" ra khỏi bảng ----------
type Label = { x: number; text: string };
const Lift: React.FC<{ img: string; rects: Rect[]; start: number; labels?: Label[]; stagger?: number }> = ({ img, rects, start, labels = [], stagger = 7 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {rects.map((r, i) => {
        const p = spring({ frame: f - start - i * stagger, fps, config: { damping: 15, mass: 0.8 } });
        return (
          <div key={i} style={{
            position: 'absolute', left: r.x * K, top: CH + r.y * K, width: r.w * K, height: r.h * K,
            transform: `translateZ(${p * 45}px) translateY(${-p * 6}px) scale(${1 + 0.03 * p})`, transformStyle: 'preserve-3d',
            opacity: p > 0.01 ? 1 : 0,
          }}>
            <div style={{
              position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 10 * p, background: '#fff',
              boxShadow: `0 ${30 * p}px ${70 * p}px rgba(0,0,0,${0.5 * p}), 0 0 0 ${2.5 * p}px ${BRAND}`,
            }}>
              <Img src={src(img)} style={{ position: 'absolute', left: -r.x * K, top: -r.y * K, width: W * K, height: H * K }} />
            </div>
            {i === 0 && labels.map((l, j) => {
              const q = spring({ frame: f - start - 14 - j * 5, fps, config: { damping: 12 } });
              return (
                <div key={j} style={{
                  position: 'absolute', left: (l.x - r.x) * K, bottom: '100%', marginBottom: 8,
                  opacity: q, transform: `translateY(${(1 - q) * 16}px) scale(${0.7 + 0.3 * q})`, transformOrigin: 'left bottom',
                }}>
                  <div style={{ padding: '4px 10px', borderRadius: 7, background: BRAND, color: '#fff', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(229,50,45,.4)' }}>{l.text}</div>
                  <div style={{ marginLeft: 16, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `8px solid ${BRAND}` }} />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

// ---------- hiệu ứng gõ chữ ----------
const Typing: React.FC<{ rect: Rect; text: string; start: number; size: number; pad: number; until?: number; perChar?: number }> = ({ rect, text, start, size, pad, until = 9999, perChar = 4 }) => {
  const f = useCurrentFrame();
  if (f < start - 2) return null;
  const n = Math.max(0, Math.min(text.length, Math.floor((f - start) / perChar)));
  const op = interpolate(f, [until, until + 10], [1, 0], cl);
  const caret = Math.floor(f / 8) % 2 === 0 || n < text.length;
  return (
    <div style={{
      position: 'absolute', left: rect.x + pad, top: rect.y + 4, width: rect.w - pad - 10, height: rect.h - 8, background: '#fff',
      display: 'flex', alignItems: 'center', fontSize: size, color: '#111', fontFamily: FONT, opacity: op,
    }}>
      {text.slice(0, n)}
      <span style={{ width: 1.5, height: size * 1.25, background: '#111', marginLeft: 1, opacity: caret ? 1 : 0 }} />
    </div>
  );
};

// ---------- cấu hình một cảnh ----------
type SceneCfg = {
  step: number; title: string; body: string; chip?: { n: number; label: string }; dur: number;
  imgs: { id: string; from?: number }[];
  cam: CamKey[]; cursor: CurKey[]; clicks: number[];
  highlights?: { rect: Rect; from: number; to?: number }[];
  lift?: { img: string; rects: Rect[]; start: number; labels?: Label[] };
  Extra?: React.FC<{ z: number }>;
};

const Stage: React.FC<{ cfg: SceneCfg }> = ({ cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const z = track(f, cfg.cam, 'z');
  const fx = track(f, cfg.cam, 'x');
  const fy = track(f, cfg.cam, 'y');
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - fx * z));
  const ty = Math.min(0, Math.max(H - H * z, H / 2 - fy * z));
  const cur = cursorAt(f, cfg.cursor);
  const press = Math.max(0, ...cfg.clicks.map((c) => interpolate(f, [c - 3, c, c + 6], [0, 1, 0], cl)));
  const liftP = cfg.lift ? spring({ frame: f - cfg.lift.start, fps, config: { damping: 16 } }) : 0;
  const curOp = cfg.lift ? interpolate(f, [cfg.lift.start - 8, cfg.lift.start + 4], [1, 0], cl) : 1;
  const Extra = cfg.Extra;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <TextPanel step={cfg.step} title={cfg.title} body={cfg.body} chip={cfg.chip} dur={cfg.dur} />
      <Frame3D dim={liftP * 0.55} overlay={cfg.lift && <Lift {...cfg.lift} />}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${K}) translate(${tx}px, ${ty}px) scale(${z})` }}>
          {cfg.imgs.map((im, i) => (
            <Img key={im.id + i} src={src(im.id)} style={{ position: 'absolute', inset: 0, width: W, height: H, opacity: im.from === undefined ? 1 : interpolate(f, [im.from, im.from + 12], [0, 1], cl) }} />
          ))}
          {Extra && <Extra z={z} />}
          {cfg.highlights?.map((h, i) => <Highlight key={i} {...h} />)}
          {cfg.clicks.map((c) => {
            const p = cursorAt(c, cfg.cursor);
            return <Ripple key={c} at={c} x={p.x} y={p.y} z={z} />;
          })}
          <Cursor x={cur.x} y={cur.y} z={z} press={press} opacity={curOp} />
        </div>
      </Frame3D>
    </AbsoluteFill>
  );
};

// ---------- các cảnh ----------
const C = { f: 0, z: 1, x: 960, y: 540 };
const tabScene = (o: {
  step: number; id: string; title: string; body: string; chip?: { n: number; label: string }; labels: Label[]; rowIdx?: number; all?: boolean; dur?: number;
}): SceneCfg => {
  const s = SH[o.id];
  const t = s.target!;
  const tm = mid(t);
  const rects = o.all ? s.rows : [s.rows[o.rowIdx ?? 0]];
  return {
    step: o.step, title: o.title, body: o.body, chip: o.chip, dur: o.dur ?? 150,
    imgs: [{ id: o.id }],
    cam: [C],
    cursor: [{ f: 0, x: 1000, y: 640 }, { f: 16, x: 1000, y: 640 }, { f: 44, x: tm.x + 10, y: tm.y + 4 }],
    clicks: [50],
    highlights: [{ rect: t, from: 52, to: 70 }],
    lift: { img: o.id, rects, start: 72, labels: o.labels },
  };
};

const homeT = SH.home.target!;
const homeM = mid(homeT);
const HOME: SceneCfg = {
  step: 1, title: 'Mở Dữ liệu gốc', dur: 150,
  body: 'Ở menu bên trái, trong nhóm "Hệ thống & Dữ liệu gốc", bấm vào Dữ liệu gốc.',
  imgs: [{ id: 'home' }],
  cam: [C, { ...C, f: 20 }, { f: 62, z: 2.4, x: homeM.x + 260, y: homeM.y - 60 }],
  cursor: [{ f: 0, x: 1100, y: 560 }, { f: 30, x: 1100, y: 560 }, { f: 74, x: homeM.x + 10, y: homeM.y + 3 }],
  clicks: [82],
  highlights: [{ rect: { x: homeT.x - 26, y: homeT.y - 8, w: 210, h: homeT.h + 16 }, from: 84 }],
};

const BRANDS = tabScene({
  step: 2, id: 'brands', title: 'Danh mục Thương hiệu',
  body: 'Mỗi brand gắn ngành hàng, gian hàng trực thuộc, chuyên viên phụ trách, ngân sách tháng và trạng thái hợp tác.',
  chip: { n: 42, label: 'thương hiệu' },
  labels: [{ x: 648, text: 'Ngành hàng' }, { x: 900, text: 'Gian hàng' }, { x: 1085, text: 'PIC phụ trách' }, { x: 1313, text: 'Ngân sách' }, { x: 1630, text: 'Trạng thái' }],
});

const sr = SH.brands.search!;
const srM = mid(sr);
const SEARCH: SceneCfg = {
  step: 3, title: 'Tìm kiếm nhanh', dur: 200,
  body: 'Gõ tên, mã, ngành hàng hoặc PIC: danh sách lọc ngay khi bạn nhập. Kết hợp thêm bộ lọc ngành hàng, trạng thái, ngân sách.',
  imgs: [{ id: 'brands' }, { id: 'brand-search', from: 120 }],
  cam: [C, { ...C, f: 18 }, { f: 52, z: 2.3, x: srM.x + 280, y: srM.y + 140 }, { f: 112, z: 2.3, x: srM.x + 280, y: srM.y + 140 }, { f: 140, z: 1, x: 960, y: 540 }],
  cursor: [{ f: 0, x: 1000, y: 620 }, { f: 22, x: 1000, y: 620 }, { f: 54, x: sr.x + 60, y: srM.y + 3 }, { f: 100, x: sr.x + 60, y: srM.y + 3 }, { f: 130, x: sr.x + 260, y: srM.y + 70 }],
  clicks: [60],
  Extra: () => <Typing rect={sr} text="Kutie" start={68} size={12} pad={30} until={124} />,
  lift: { img: 'brand-search', rects: [SH['brand-search'].rows[0]], start: 150, labels: [{ x: 330, text: 'Kết quả khớp "Kutie"' }] },
};

const md = SH['brand-modal'];
const ab = SH.brands.addBtn!;
const abM = mid(ab);
const dg = md.dialog!;
const ni = md.nameInput!;
const cb = md.createBtn!;
const ModalExtra: React.FC<{ z: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = spring({ frame: f - 48, fps, config: { damping: 14 } });
  const close = interpolate(f, [168, 178], [0, 1], cl);
  const p = open * (1 - close);
  const toast = spring({ frame: f - 180, fps, config: { damping: 14 } });
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(15,15,25,${0.4 * p})` }} />
      <div style={{
        position: 'absolute', left: dg.x, top: dg.y, width: dg.w, height: dg.h, opacity: p,
        transform: `scale(${0.88 + 0.12 * p}) translateY(${(1 - open) * 30}px)`, borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,.35)',
      }}>
        <Img src={src('modal')} style={{ width: dg.w, height: dg.h }} />
        <div style={{ position: 'absolute', left: 0, top: 0 }}>
          <Typing rect={{ x: ni.x - dg.x, y: ni.y - dg.y, w: ni.w, h: ni.h }} text="Torriden" start={100} size={14} pad={13} perChar={4} />
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 1450, top: 22, width: 430, padding: '14px 18px', borderRadius: 12, background: '#fff',
        display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 16px 40px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)',
        opacity: toast, transform: `translateX(${(1 - toast) * 80}px)`, fontFamily: FONT,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 800 }}>✓</div>
        <div style={{ fontSize: 15, color: '#111', fontWeight: 600 }}>Đã tạo thương hiệu Torriden</div>
      </div>
    </>
  );
};
const MODAL: SceneCfg = {
  step: 4, title: 'Thêm thương hiệu mới', dur: 235,
  body: 'Bấm "Thêm thương hiệu", nhập tên brand và chọn ngành hàng. Mã brand tự sinh nếu để trống.',
  imgs: [{ id: 'brands' }],
  cam: [C, { ...C, f: 60 }, { f: 92, z: 1.75, x: mid(dg).x, y: mid(dg).y }, { f: 165, z: 1.75, x: mid(dg).x, y: mid(dg).y }, { f: 190, z: 1, x: 960, y: 540 }],
  cursor: [{ f: 0, x: 1000, y: 640 }, { f: 12, x: 1000, y: 640 }, { f: 40, x: abM.x, y: abM.y + 3 }, { f: 70, x: abM.x - 40, y: abM.y + 120 }, { f: 92, x: ni.x + 120, y: mid(ni).y + 3 }, { f: 138, x: ni.x + 120, y: mid(ni).y + 3 }, { f: 160, x: mid(cb).x, y: mid(cb).y + 3 }],
  clicks: [44, 96, 164],
  highlights: [{ rect: ab, from: 30, to: 46 }],
  Extra: ModalExtra,
};

const mmT = mid(SH.mindmap.target!);
const MINDMAP: SceneCfg = {
  step: 6, title: 'Sơ đồ phân cấp', dur: 235,
  body: 'Cây Brand → Gian hàng → PIC → SKU. Chọn một nút để xem chi tiết ngân sách, sản phẩm và đổi PIC chính.',
  imgs: [{ id: 'mindmap' }],
  cam: [C, { ...C, f: 52 }, { f: 88, z: 1.8, x: 465, y: 400 }, { f: 130, z: 1.8, x: 800, y: 400 }, { f: 175, z: 1.75, x: 1160, y: 440 }, { f: 225, z: 1.6, x: 1595, y: 560 }],
  cursor: [{ f: 0, x: 1000, y: 640 }, { f: 14, x: 1000, y: 640 }, { f: 40, x: mmT.x, y: mmT.y + 3 }, { f: 88, x: 520, y: 420 }, { f: 130, x: 860, y: 420 }, { f: 175, x: 1210, y: 470 }, { f: 222, x: 1640, y: 470 }],
  clicks: [46],
  highlights: [
    { rect: { x: 338, y: 285, w: 254, h: 184 }, from: 92, to: 130 },
    { rect: { x: 660, y: 285, w: 286, h: 182 }, from: 132, to: 172 },
    { rect: { x: 1014, y: 285, w: 286, h: 248 }, from: 176, to: 220 },
  ],
};

const SCENES: SceneCfg[] = [
  HOME, BRANDS, SEARCH, MODAL,
  tabScene({
    step: 5, id: 'stores', title: 'Gian hàng',
    body: 'Gian hàng Shopee & TikTok Shop với hạn mức Order Net, chỉ tiêu video, đội ngũ phụ trách và cảnh báo tài chính.',
    chip: { n: 69, label: 'gian hàng' },
    labels: [{ x: 535, text: 'Nền tảng' }, { x: 810, text: 'Hạn mức Net' }, { x: 975, text: 'Chỉ tiêu video' }, { x: 1150, text: 'PIC' }, { x: 1320, text: 'Cảnh báo' }],
  }),
  MINDMAP,
  tabScene({
    step: 7, id: 'products', title: 'Sản phẩm (Master SKU)',
    body: 'Mã SKU, USP, thương hiệu, gian hàng bán, hoa hồng và giá niêm yết, dùng chung cho booking và kịch bản.',
    chip: { n: 15, label: 'SKU' },
    labels: [{ x: 329, text: 'Mã SKU & USP' }, { x: 831, text: 'Thương hiệu' }, { x: 1000, text: 'Gian hàng' }, { x: 1263, text: 'Hoa hồng' }, { x: 1440, text: 'Giá' }],
  }),
  tabScene({
    step: 8, id: 'pillars', title: 'Trụ cột nội dung',
    body: 'Định hướng sáng tạo chuẩn cho từng pillar: mục tiêu, format video gợi ý và định mức tham chiếu.',
    chip: { n: 15, label: 'trụ cột' },
    labels: [{ x: 329, text: 'Mã chuẩn' }, { x: 569, text: 'Định hướng & mục tiêu' }, { x: 1258, text: 'Format' }, { x: 1440, text: 'Định mức' }],
  }),
  tabScene({
    step: 9, id: 'kocs', title: 'Danh bạ KOC',
    body: 'Phân loại KL1–KL7, tệp kênh, nhãn hàng phụ trách, tình trạng giấy tờ, followers và giá mỗi video.',
    chip: { n: 125, label: 'KOC' },
    labels: [{ x: 751, text: 'Phân loại' }, { x: 923, text: 'Tệp kênh' }, { x: 1124, text: 'Nhãn hàng · PIC' }, { x: 1357, text: 'Hồ sơ' }, { x: 1600, text: 'Giá/video' }],
  }),
  tabScene({
    step: 10, id: 'staff', title: 'Nhân sự Booking', rowIdx: 2,
    body: 'Đồng bộ từ HR: phòng ban, chức danh, khối hệ thống và quyền đăng nhập của từng nhân sự.',
    chip: { n: 1011, label: 'nhân sự' },
    labels: [{ x: 329, text: 'Mã NV' }, { x: 868, text: 'Phòng ban' }, { x: 1411, text: 'Khối' }, { x: 1580, text: 'Quản lý' }, { x: 1735, text: 'Login' }],
  }),
  tabScene({
    step: 11, id: 'sla', title: 'Chuẩn SLA & KPI',
    body: '7 mốc SLA với thời hạn, ngưỡng cảnh báo, cấp leo thang và điểm phạt, cùng 10 chỉ số KPI theo chức danh.',
    chip: { n: 17, label: 'chuẩn SLA & KPI' },
    labels: [{ x: 536, text: 'Mốc vận hành' }, { x: 1233, text: 'SLA' }, { x: 1341, text: 'Cảnh báo' }, { x: 1600, text: 'Leo thang' }, { x: 1742, text: 'Phạt' }],
  }),
  tabScene({
    step: 12, id: 'audit', title: 'Nhật ký kiểm toán', all: true, dur: 165,
    body: 'Mọi thao tác submit, phê duyệt, kích hoạt dự phòng đều được ghi lại: ai làm, lúc nào, thay đổi gì.',
    labels: [{ x: 599, text: 'Hành động' }, { x: 770, text: 'Đối tượng' }, { x: 909, text: 'Người thực hiện' }, { x: 1108, text: 'Nội dung thay đổi' }],
  }),
];

// ---------- tường ảnh chụp 3D (intro / outro) ----------
const ALL_SHOTS = ['brands', 'stores', 'mindmap', 'products', 'pillars', 'kocs', 'staff', 'sla', 'audit', 'brand-search', 'home', 'brands'];
const Wall: React.FC<{ cols: number; tile: number; rx: number; rz: number; drift: number; scale: number; opacity: number }> = ({ cols, tile, rx, rz, drift, scale, opacity }) => {
  const f = useCurrentFrame();
  const th = tile * (H / W);
  const rowsN = Math.ceil(ALL_SHOTS.length / cols) + 1;
  return (
    <AbsoluteFill style={{ perspective: 2000, opacity }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', display: 'grid', gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gap: 28,
        transform: `translate(-50%, -50%) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${scale}) translateY(${-f * drift}px)`,
      }}>
        {Array.from({ length: cols * rowsN }).map((_, i) => (
          <div key={i} style={{ width: tile, height: th, borderRadius: 14, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,.5)', background: '#fff' }}>
            <Img src={src(ALL_SHOTS[i % ALL_SHOTS.length])} style={{ width: tile, height: th }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f - 6, fps, config: { damping: 12 } });
  const line = spring({ frame: f - 46, fps, config: { damping: 20 } });
  const sub = spring({ frame: f - 52, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Wall cols={5} tile={520} rx={52} rz={-24} drift={0.9} scale={1.25} opacity={interpolate(f, [0, 30], [0, 0.55], cl)} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(11,11,16,.55) 0%, rgba(11,11,16,.92) 60%)' }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * logo})`, opacity: logo, marginBottom: 40 }}><Logo size={64} /></div>
        <div style={{ fontSize: 24, letterSpacing: 6, color: '#ff8a80', fontWeight: 700, opacity: interpolate(f, [18, 32], [0, 1], cl) }}>HƯỚNG DẪN SỬ DỤNG</div>
        <div style={{ marginTop: 16 }}><Words text="Quản lý Dữ liệu gốc" start={24} size={104} gap={4} /></div>
        <div style={{ width: 220 * line, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${BRAND}, #ff9f43)`, margin: '26px auto 0' }} />
        <div style={{ marginTop: 28, fontSize: 30, color: 'rgba(255,255,255,.75)', opacity: sub, transform: `translateY(${(1 - sub) * 16}px)` }}>
          Thương hiệu · Gian hàng · Sản phẩm · KOC · Nhân sự · SLA & KPI
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const STATS = [
  { n: 69, label: 'Gian hàng' }, { n: 15, label: 'Sản phẩm' }, { n: 15, label: 'Trụ cột nội dung' }, { n: 9, label: 'Bậc cast' },
  { n: 34, label: 'Tệp kênh' }, { n: 9, label: 'Định dạng video' }, { n: 125, label: 'KOC' }, { n: 1011, label: 'Nhân sự' },
];
const Interlude: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 22, letterSpacing: 5, color: '#ff8a80', fontWeight: 700, opacity: interpolate(f, [0, 12], [0, 1], cl) }}>KHÔNG CHỈ THƯƠNG HIỆU</div>
        <div style={{ marginTop: 14 }}><Words text="Một nguồn dữ liệu chuẩn cho toàn khối B2C" start={6} size={60} gap={2} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 330px)', gap: 24 }}>
        {STATS.map((s, i) => {
          const p = spring({ frame: f - 22 - i * 4, fps, config: { damping: 13 } });
          return (
            <div key={s.label} style={{
              padding: '26px 30px', borderRadius: 22, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
              opacity: p, transform: `translateY(${(1 - p) * 50}px) scale(${0.85 + 0.15 * p})`,
            }}>
              <Counter n={s.n} start={24 + i * 4} dur={36} style={{ fontSize: 62, fontWeight: 800, color: '#fff' }} />
              <div style={{ fontSize: 22, color: 'rgba(255,255,255,.7)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wall = spring({ frame: f, fps, config: { damping: 22, mass: 1.4 } });
  const card = spring({ frame: f - 40, fps, config: { damping: 15 } });
  const end = interpolate(f, [170, 200], [0, 1], cl);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Wall cols={4} tile={430} rx={interpolate(wall, [0, 1], [60, 22])} rz={interpolate(wall, [0, 1], [-30, -10])} drift={0.25} scale={interpolate(wall, [0, 1], [1.6, 1.05])} opacity={wall * 0.9} />
      <AbsoluteFill style={{ background: `rgba(11,11,16,${0.35 + card * 0.45})` }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', opacity: card, transform: `scale(${0.9 + 0.1 * card})` }}>
        <Logo size={58} />
        <div style={{ marginTop: 34 }}><Words text="Dữ liệu gốc luôn chuẩn và đồng bộ" start={46} size={76} gap={3} /></div>
        <div style={{ marginTop: 22, fontSize: 28, color: 'rgba(255,255,255,.75)' }}>Mọi thay đổi đều được ghi vào Nhật ký kiểm toán</div>
        <div style={{ marginTop: 44, padding: '14px 30px', borderRadius: 40, background: BRAND, color: '#fff', fontSize: 24, fontWeight: 700, boxShadow: '0 16px 40px rgba(229,50,45,.45)' }}>
          Upbase Ops · Marketing B2C
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: end }} />
    </AbsoluteFill>
  );
};

// ---------- dựng timeline ----------
const T = 20;
type Item = { dur: number; el: React.ReactNode; tr: 'fade' | 'slide' | 'wipe' };
const ITEMS: Item[] = [
  { dur: 170, el: <Intro />, tr: 'fade' },
  ...SCENES.slice(0, 4).map((s): Item => ({ dur: s.dur, el: <Stage cfg={s} />, tr: s.step === 1 ? 'fade' : 'slide' })),
  { dur: 130, el: <Interlude />, tr: 'wipe' },
  ...SCENES.slice(4).map((s, i): Item => ({ dur: s.dur, el: <Stage cfg={s} />, tr: i === 0 ? 'wipe' : 'slide' })),
  { dur: 200, el: <Outro />, tr: 'fade' },
];

export const DURATION = ITEMS.reduce((a, it) => a + it.dur, 0) - (ITEMS.length - 1) * T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pres = (k: Item['tr']): TransitionPresentation<any> =>
  k === 'fade' ? fade() : k === 'wipe' ? wipe({ direction: 'from-left' }) : slide({ direction: 'from-right' });

export const Video: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Backdrop />
    <TransitionSeries>
      {ITEMS.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <TransitionSeries.Transition presentation={pres(it.tr)} timing={linearTiming({ durationInFrames: T })} />}
          <TransitionSeries.Sequence durationInFrames={it.dur}>{it.el}</TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  </AbsoluteFill>
);
