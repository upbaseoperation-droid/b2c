// Upbase Marketing B2C Management Hub - Application Logic

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initPipeline();
  initSLATable();
  initBrandTeam();
  initContentTeam();
  initBookingTeam();
  initContractGenerator();
  initLeaderboard();
});

// 1. Navigation handling
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const titles = {
    overview: {
      title: "Tổng Quan Vận Hành & Đo Lường SLA",
      subtitle: "Hệ thống quản trị Marketing B2C Upbase — Đồng bộ 3 Team, Tự động hóa & Khử Lag"
    },
    brand: {
      title: "Brand Team — Chiến Lược & Định Vị",
      subtitle: "Quản lý Brand Strategy, Value Proposition, Big Idea và bàn giao Campaign Brief chuẩn"
    },
    content: {
      title: "Content Team — Sáng Tạo & Kế Hoạch Đa Kênh",
      subtitle: "Master Content Plan, Content Pillars, kịch bản TikTok/Shopee và bàn giao góc quay"
    },
    booking: {
      title: "Booking Content Execution — Quản Trị KOC Đa Tầng",
      subtitle: "Cơ sở dữ liệu KOC 4 Tier (Celeb, Macro, Micro, Affiliate) — Tải hàng chục ngàn dòng Zero-Lag"
    },
    contracts: {
      title: "⚡ Auto Contract Generator — Tự Động Hóa Hợp Đồng KOC",
      subtitle: "Giải phóng dứt điểm khâu gõ tay — Tự động sinh hợp đồng PDF, tính toán tạm ứng 2tr/10tr và bắn duyệt Lark"
    },
    leaderboard: {
      title: "Bảng Vàng Thi Đua — Gamification & Động Lực",
      subtitle: "Tách bạch Năng Lực (Kỷ luật SLA) vs Kết Quả (GMV/Sản lượng) — Minh bạch cho 30 nhân sự"
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      item.classList.add('active');
      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) targetPane.classList.add('active');

      if (titles[tabId]) {
        pageTitle.textContent = titles[tabId].title;
        pageSubtitle.textContent = titles[tabId].subtitle;
      }
    });
  });

  // Quick contract button
  const btnQuick = document.getElementById('btn-quick-contract');
  if (btnQuick) {
    btnQuick.addEventListener('click', () => {
      const contractNav = document.querySelector('.nav-item[data-tab="contracts"]');
      if (contractNav) contractNav.click();
    });
  }
}

// 2. Pipeline Visualization (Brand -> Content -> Booking)
function initPipeline() {
  const brandCol = document.getElementById('col-brand');
  const contentCol = document.getElementById('col-content');
  const bookingCol = document.getElementById('col-booking');

  const brandTasks = [
    { title: "Mega Sale 10.10: Kháng Nắng", desc: "Big Idea: 'Lá Chắn Đa Tầng' - Định vị UV Protection", sla: "Còn 14h", pic: "Phương Thảo (Brand)" },
    { title: "Brand Re-positioning Q4", desc: "Xác lập Value Proposition dòng Dược Mỹ phẩm", sla: "Đã duyệt", pic: "Tiến (Brand Lead)" }
  ];

  const contentTasks = [
    { title: "Master Plan 10.10: 45 Posts", desc: "Pillars: Giáo dục UV (40%) + Flash Deal (60%)", sla: "Còn 8h", pic: "Quỳnh Như (Content)" },
    { title: "Kịch bản TikTok Hero Video", desc: "Angle 'Bác sĩ kiểm nghiệm chỉ số SPF thực tế'", sla: "Còn 22h", pic: "Hoàng Linh (Content)" }
  ];

  const bookingTasks = [
    { title: "Booking 30 KOC Video Tier 3", desc: "Đã chốt 26/30 KOC. 18 hợp đồng đã ký & chi tạm ứng", sla: "Còn 16h", pic: "Khánh Vy (Booking)" },
    { title: "Live Affiliate Marathon D-Day", desc: "Booking 8 KOC Live đồng thời từ 19h-24h", sla: "Đang triển khai", pic: "Nguyễn Anh (Booking)" }
  ];

  renderPipelineItems(brandCol, brandTasks, 'brand');
  renderPipelineItems(contentCol, contentTasks, 'content');
  renderPipelineItems(bookingCol, bookingTasks, 'booking');
}

function renderPipelineItems(container, items, type) {
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="pipeline-item">
      <div class="item-top">
        <span class="item-title">${item.title}</span>
        <span class="badge ${item.sla.includes('Đã') ? 'success' : 'info'}">${item.sla}</span>
      </div>
      <p class="item-desc">${item.desc}</p>
      <div class="item-meta">
        <span>👤 ${item.pic}</span>
        <span>SLA: Chuẩn hóa</span>
      </div>
    </div>
  `).join('');
}

// 3. SLA Control Table
function initSLATable() {
  const tbody = document.getElementById('sla-table-body');
  if (!tbody) return;

  const slaData = [
    { id: "BRIEF-1010-01", desc: "Bàn giao Campaign Brief 10.10 sang Content", team: "Brand Team", pic: "Phương Thảo", deadline: "22/09 20:00", remaining: "3 giờ 45 phút", status: "warn", statusText: "Sắp chạm trần" },
    { id: "SCRIPT-TK-088", desc: "Duyệt kịch bản KOC Chanh Review (60s)", team: "Content Team", pic: "Quỳnh Như", deadline: "23/09 11:00", remaining: "18 giờ", status: "good", statusText: "Đúng hạn" },
    { id: "CTR-KOC-0901", desc: "Duyệt chi tạm ứng 2tr hợp đồng KOC Chanh", team: "Kế toán / Lead", pic: "Thu Trang (Kế toán)", deadline: "22/09 22:00", remaining: "5 giờ 20 phút", status: "good", statusText: "Đang chờ ký" },
    { id: "SAMPLE-SHIP-12", desc: "Gửi 15 mẫu sản phẩm KOC Tier 3 khu vực SG", team: "Booking Exec", pic: "Minh Quân", deadline: "23/09 17:00", remaining: "24 giờ", status: "good", statusText: "Đúng hạn" },
    { id: "VERIFY-LNK-44", desc: "Nghiệm thu 8 link video lên sóng khung giờ vàng", team: "Booking Exec", pic: "Khánh Vy", deadline: "22/09 18:00", remaining: "Đã hoàn thành", status: "done", statusText: "Hoàn thành 100%" }
  ];

  tbody.innerHTML = slaData.map(row => `
    <tr>
      <td><strong>${row.id}</strong></td>
      <td>${row.desc}</td>
      <td><span class="badge info">${row.team}</span></td>
      <td>${row.pic}</td>
      <td>${row.deadline}</td>
      <td><span class="${row.status === 'warn' ? 'stat-trend gold' : ''}">${row.remaining}</span></td>
      <td>
        <span class="badge ${row.status === 'warn' ? 'warning' : row.status === 'done' ? 'success' : 'info'}">
          ${row.statusText}
        </span>
      </td>
    </tr>
  `).join('');
}

// 4. Brand Team View
function initBrandTeam() {
  const container = document.getElementById('brand-campaigns-grid');
  if (!container) return;

  const campaigns = [
    {
      id: "CAMP-1010",
      tag: "Mega Campaign Q4",
      title: "Chiến Dịch Mega Sale 10.10 — Kháng Nắng Đa Tầng",
      audience: "Nữ 18-28 tuổi, văn phòng, sinh viên hay tiếp xúc ánh sáng xanh và tia UV",
      bigIdea: "'Lá Chắn Đa Tầng — Bảo Vệ Toàn Diện Cả Ngày Dài'",
      budget: "250.000.000 đ",
      kpi: "GMV 1.8 Tỷ • 2.5 Triệu Views Video"
    },
    {
      id: "CAMP-GLOW",
      tag: "Seasonal Launch",
      title: "Chiến Dịch Thu Đông Rạng Rỡ — Phục Hồi Chuyên Sâu",
      audience: "Nữ 22-35 tuổi quan tâm dưỡng ẩm, chống lão hóa mùa hanh khô",
      bigIdea: "'Cấp Ẩm Đa Tầng Cho Làn Da Căng Mọng Mùa Lạnh'",
      budget: "180.000.000 đ",
      kpi: "GMV 1.2 Tỷ • 1.8 Triệu Views Video"
    }
  ];

  container.innerHTML = campaigns.map(c => `
    <div class="campaign-box">
      <div class="camp-header">
        <span class="camp-tag">${c.tag}</span>
        <span class="badge success">Đang Chạy</span>
      </div>
      <h3 class="camp-title">${c.title}</h3>
      <p class="camp-info-row"><strong>Target Audience:</strong> ${c.audience}</p>
      <p class="camp-info-row"><strong>Big Idea & Key Message:</strong> ${c.bigIdea}</p>
      <p class="camp-info-row"><strong>Ngân Sách Phân Bổ:</strong> ${c.budget} | <strong>KPI:</strong> ${c.kpi}</p>
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="btn btn-sm btn-outline">Xem Brief Chi Tiết</button>
        <button class="btn btn-sm btn-primary">Chuyển Sang Content Team (SLA 24h)</button>
      </div>
    </div>
  `).join('');
}

// 5. Content Team View
function initContentTeam() {
  const container = document.getElementById('content-pillars-container');
  if (!container) return;

  const pillars = [
    {
      name: "Pillar 1: Giáo dục & Đập tan hoài nghi (Educational)",
      ratio: "35% sản lượng",
      channels: "TikTok Video, Shopee Feed, Reels",
      angles: "Thử nghiệm soi camera UV trước & sau khi thoa; Bác sĩ giải thích cơ chế",
      status: "Đã bàn giao 12 kịch bản sang Booking"
    },
    {
      name: "Pillar 2: Trải nghiệm & Social Proof (KOC Review)",
      ratio: "45% sản lượng",
      channels: "TikTok Video, Shopee Video, Threads",
      angles: "Cảm nhận chất kem không bết rít; Thử thách 8 tiếng kiềm dầu ngoài trời",
      status: "Đang điều phối 20 KOC quay sample"
    },
    {
      name: "Pillar 3: Chốt đơn & Flash Promotion (Commercial/Urgency)",
      ratio: "20% sản lượng",
      channels: "Livestream TikTok/Shopee, Banner SIS, PDP",
      angles: "Voucher độc quyền 10.10 mua 1 tặng 1; Deal sốc giờ vàng",
      status: "Đã duyệt thiết kế Banner & PDP"
    }
  ];

  container.innerHTML = `
    <div class="cards-grid">
      ${pillars.map(p => `
        <div class="campaign-box">
          <div class="camp-header">
            <span class="badge info">${p.ratio}</span>
            <span class="badge success">Active</span>
          </div>
          <h3 class="camp-title">${p.name}</h3>
          <p class="camp-info-row"><strong>Kênh phân phối:</strong> ${p.channels}</p>
          <p class="camp-info-row"><strong>Định hướng góc quay (Angles):</strong> ${p.angles}</p>
          <p class="camp-info-row"><strong>Trạng thái:</strong> ${p.status}</p>
          <div style="margin-top: 14px;">
            <button class="btn btn-sm btn-outline">Xuất Execution Brief cho Booking Team</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 6. Booking Team Database (4 Tiers)
const kocDatabase = [
  { name: "Chanh Review", stage: "Chanh Beauty Review", tier: "Tier 3 (Micro)", niche: "Skincare / Mỹ phẩm", followers: "320.000", rate: "10.000.000 đ", score: "9.8/10", phone: "0987654321", cccd: "001201004567" },
  { name: "Hannah Olala", stage: "Hannah Olala", tier: "Tier 1 (Celebrity)", niche: "Beauty & Lifestyle", followers: "1.400.000", rate: "65.000.000 đ", score: "10/10", phone: "0912345678", cccd: "079182003921" },
  { name: "Võ Hà Linh", stage: "Hà Linh Official", tier: "Tier 1 (Celebrity)", niche: "Review & Livestream", followers: "4.200.000", rate: "120.000.000 đ", score: "10/10", phone: "0909123456", cccd: "038192004812" },
  { name: "Call Me Duy", stage: "Call Me Duy", tier: "Tier 2 (Macro)", niche: "Thành phần Mỹ phẩm", followers: "680.000", rate: "35.000.000 đ", score: "9.5/10", phone: "0978123987", cccd: "001293819234" },
  { name: "Bảo Ngọc Skincare", stage: "Ngọc Mê Skincare", tier: "Tier 4 (Affiliate)", niche: "Skincare HSSV", followers: "85.000", rate: "2.500.000 đ", score: "9.2/10", phone: "0934567890", cccd: "001202938475" },
  { name: "Minh Đan Daily", stage: "Đan Đan Xinh", tier: "Tier 3 (Micro)", niche: "Makeup & Daily", followers: "210.000", rate: "8.000.000 đ", score: "9.6/10", phone: "0967891234", cccd: "001203948572" }
];

function initBookingTeam() {
  const tbody = document.getElementById('koc-table-body');
  const searchInput = document.getElementById('koc-search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let currentTier = 'all';
  let searchTerm = '';

  function renderTable() {
    if (!tbody) return;

    const filtered = kocDatabase.filter(koc => {
      const matchTier = currentTier === 'all' || koc.tier.includes(currentTier.replace('Tier ', '').split(' ')[0]);
      const matchSearch = koc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          koc.stage.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          koc.niche.toLowerCase().includes(searchTerm.toLowerCase());
      return matchTier && matchSearch;
    });

    tbody.innerHTML = filtered.map(koc => `
      <tr>
        <td>
          <div style="font-weight: 700; color: #f8fafc;">${koc.stage}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${koc.name} • ${koc.phone}</div>
        </td>
        <td>
          <span class="badge ${koc.tier.includes('1') ? 'gold' : koc.tier.includes('2') ? 'purple' : koc.tier.includes('3') ? 'info' : 'success'}">
            ${koc.tier}
          </span>
        </td>
        <td>${koc.niche}</td>
        <td><strong>${koc.followers}</strong></td>
        <td style="color: #38bdf8; font-weight: 600;">${koc.rate}</td>
        <td><span class="badge success">${koc.score}</span></td>
        <td>
          <button class="btn btn-sm btn-outline btn-book-koc" data-koc='${JSON.stringify(koc)}'>⚡ Lên Hợp Đồng</button>
        </td>
      </tr>
    `).join('');

    // Attach click events to "Lên Hợp Đồng"
    document.querySelectorAll('.btn-book-koc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const koc = JSON.parse(btn.getAttribute('data-koc'));
        fillContractFormWithKOC(koc);
        const contractNav = document.querySelector('.nav-item[data-tab="contracts"]');
        if (contractNav) contractNav.click();
      });
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTier = btn.getAttribute('data-tier');
      renderTable();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderTable();
    });
  }

  renderTable();
}

function fillContractFormWithKOC(koc) {
  const nameInput = document.getElementById('cf-koc-name');
  const stageInput = document.getElementById('cf-koc-stage');
  const cccdInput = document.getElementById('cf-koc-cccd');
  const totalInput = document.getElementById('cf-total');
  const advanceInput = document.getElementById('cf-advance');

  if (nameInput) nameInput.value = koc.name;
  if (stageInput) stageInput.value = koc.stage;
  if (cccdInput) cccdInput.value = koc.cccd;

  const rawRate = parseInt(koc.rate.replace(/\D/g, '')) || 10000000;
  if (totalInput) totalInput.value = rawRate;
  
  // Default 20% advance or 2,000,000
  const advanceVal = Math.min(2000000, rawRate * 0.2);
  if (advanceInput) advanceInput.value = advanceVal;

  updateContractPreview();
}

// 7. Auto Contract Generator
function initContractGenerator() {
  const form = document.getElementById('contract-form');
  const totalInput = document.getElementById('cf-total');
  const advanceInput = document.getElementById('cf-advance');
  const finalInput = document.getElementById('cf-final');

  function calculateSplit() {
    const total = parseFloat(totalInput.value) || 0;
    const advance = parseFloat(advanceInput.value) || 0;
    const finalVal = Math.max(0, total - advance);
    finalInput.value = finalVal.toLocaleString('vi-VN') + ' đ';
    updateContractPreview();
  }

  if (totalInput && advanceInput) {
    totalInput.addEventListener('input', calculateSplit);
    advanceInput.addEventListener('input', calculateSplit);
  }

  const allInputs = form.querySelectorAll('input, select');
  allInputs.forEach(input => {
    input.addEventListener('input', updateContractPreview);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const kocName = document.getElementById('cf-koc-name').value;
    const total = parseFloat(totalInput.value).toLocaleString('vi-VN');
    const advance = parseFloat(advanceInput.value).toLocaleString('vi-VN');
    const contractCode = 'UB-B2C-' + Math.floor(1000 + Math.random() * 9000);

    alert(`🎉 THÀNH CÔNG!\n\nĐã tự động tạo Hợp đồng [${contractCode}] cho KOC ${kocName}!\n\n` +
          `• Tổng giá trị: ${total} VNĐ\n` +
          `• Đợt 1 Tạm ứng: ${advance} VNĐ\n` +
          `• Luồng Lark Bot: Đã bắn thông báo trình ký tới Kế toán & Quản lý.\n` +
          `• Cam kết SLA duyệt: Trong vòng 12 giờ làm việc.`);
  });

  updateContractPreview();
}

function updateContractPreview() {
  const previewBox = document.getElementById('contract-document-preview');
  if (!previewBox) return;

  const campaign = document.getElementById('cf-campaign')?.value || "Mega Sale 10.10";
  const staff = document.getElementById('cf-staff')?.value || "Nguyễn Văn A (Booking Team)";
  const kocName = document.getElementById('cf-koc-name')?.value || "Lê Thị Bích Chanh";
  const kocStage = document.getElementById('cf-koc-stage')?.value || "Chanh Beauty Review";
  const cccd = document.getElementById('cf-koc-cccd')?.value || "001201004567";
  const bank = document.getElementById('cf-koc-bank')?.value || "Techcombank - 1903456789012";
  const deliverables = document.getElementById('cf-deliverables')?.value || "01 Video TikTok 60s";
  
  const totalVal = parseFloat(document.getElementById('cf-total')?.value) || 10000000;
  const advanceVal = parseFloat(document.getElementById('cf-advance')?.value) || 2000000;
  const finalVal = Math.max(0, totalVal - advanceVal);

  previewBox.innerHTML = `
    <div class="doc-header">
      <h4>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
      <p>Độc lập - Tự do - Hạnh phúc</p>
      <div style="margin-top: 10px; font-weight: 800; font-size: 1rem; color: #1e3a8a;">
        HỢP ĐỒNG DỊCH VỤ QUẢNG BÁ NỘI DUNG (KOC MARKETING)
      </div>
      <div style="font-size: 0.75rem; color: #6b7280;">Mã số: UB-B2C-2026-AUTO | Ngày lập: 22/09/2026</div>
    </div>

    <div class="doc-section">
      <h5>BÊN A: CÔNG TY CỔ PHẦN UPBASE ASIA</h5>
      <p>• Đại diện: Ban Điều Hành Marketing B2C | Phụ trách: <strong>${staff}</strong></p>
    </div>

    <div class="doc-section">
      <h5>BÊN B: NGHỆ SĨ / NHÀ SÁNG TẠO NỘI DUNG (KOC)</h5>
      <p>• Họ và tên: <strong>${kocName}</strong> (Kênh: <strong>${kocStage}</strong>)</p>
      <p>• Số CCCD/CMND: <strong>${cccd}</strong></p>
      <p>• Tài khoản nhận thanh toán: <strong>${bank}</strong></p>
    </div>

    <div class="doc-section">
      <h5>ĐIỀU 1: NỘI DUNG DỊCH VỤ & NGHIỆM THU</h5>
      <p>Bên B cam kết sản xuất và đăng tải nội dung theo đúng yêu cầu chiến dịch <strong>${campaign}</strong>:</p>
      <p style="background: #f3f4f6; padding: 6px; border-radius: 4px; font-weight: 600;">➔ ${deliverables}</p>
      <p>• Kịch bản phải được Content Team Upbase phê duyệt trước khi quay (SLA duyệt kịch bản 24h).</p>
      <p>• Gắn đúng link Affiliate và giỏ hàng chính hãng theo hướng dẫn.</p>
    </div>

    <div class="doc-section">
      <h5>ĐIỀU 2: PHÍ DỊCH VỤ & ĐỢT TẠM ỨNG (AUTO-SPLIT)</h5>
      <table class="doc-table">
        <tr>
          <th>Hạng mục</th>
          <th>Số tiền (VNĐ)</th>
          <th>Điều kiện giải ngân</th>
          <th>Thời hạn SLA</th>
        </tr>
        <tr>
          <td><strong>Đợt 1 (Tạm ứng)</strong></td>
          <td style="color: #059669; font-weight: 700;">${advanceVal.toLocaleString('vi-VN')} đ</td>
          <td>Sau khi ký HĐ & duyệt kịch bản</td>
          <td>Trong vòng 12h</td>
        </tr>
        <tr>
          <td><strong>Đợt 2 (Quyết toán)</strong></td>
          <td style="color: #2563eb; font-weight: 700;">${finalVal.toLocaleString('vi-VN')} đ</td>
          <td>Sau khi nghiệm thu link video</td>
          <td>Trong vòng 48h</td>
        </tr>
        <tr style="background: #eef2ff;">
          <td><strong>TỔNG GIÁ TRỊ</strong></td>
          <td colspan="3" style="font-weight: 800; font-size: 0.95rem; color: #1e3a8a;">
            ${totalVal.toLocaleString('vi-VN')} VNĐ
          </td>
        </tr>
      </table>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 0.78rem;">
      <div style="text-align: center;">
        <strong>ĐẠI DIỆN BÊN A</strong><br>
        <em>(Đã ký duyệt điện tử qua Lark)</em>
      </div>
      <div style="text-align: center;">
        <strong>ĐẠI DIỆN BÊN B</strong><br>
        <em>${kocName}</em>
      </div>
    </div>
  `;
}

// 8. Gamification Leaderboard
function initLeaderboard() {
  const tbody = document.getElementById('leaderboard-table-body');
  if (!tbody) return;

  const staffData = [
    { rank: 1, name: "Khánh Vy", team: "Booking Exec", sla: "100%", posts: "32 Clips", gmv: "420.000.000 đ", score: 1120, badge: "Chiến Thần Booking" },
    { rank: 2, name: "Hoàng Linh", team: "Content Team", sla: "98%", posts: "24 Kịch bản", gmv: "380.000.000 đ", score: 945, badge: "Hero Content Creator" },
    { rank: 3, name: "Nguyễn Anh", team: "Booking Exec", sla: "100%", posts: "28 Clips", gmv: "310.000.000 đ", score: 890, badge: "SLA Champion" },
    { rank: 4, name: "Quỳnh Như", team: "Content Team", sla: "95%", posts: "18 Master Plans", gmv: "250.000.000 đ", score: 820, badge: "Top Strategy" },
    { rank: 5, name: "Phương Thảo", team: "Brand Team", sla: "96%", posts: "4 Campaigns", gmv: "520.000.000 đ", score: 795, badge: "Master Planner" },
    { rank: 6, name: "Minh Quân", team: "Booking Exec", sla: "92%", posts: "20 Clips", gmv: "190.000.000 đ", score: 710, badge: "KOC Hunter" },
    { rank: 7, name: "Thu Trang", team: "Booking Exec", sla: "94%", posts: "19 Clips", gmv: "185.000.000 đ", score: 690, badge: "Rising Star" }
  ];

  tbody.innerHTML = staffData.map(s => `
    <tr>
      <td><strong style="color: ${s.rank <= 3 ? '#f59e0b' : 'var(--text-muted)'}; font-size: 1rem;">#${s.rank}</strong></td>
      <td><strong>${s.name}</strong></td>
      <td><span class="badge info">${s.team}</span></td>
      <td><strong style="color: #10b981;">${s.sla}</strong></td>
      <td>${s.posts}</td>
      <td style="color: #38bdf8; font-weight: 600;">${s.gmv}</td>
      <td><span style="font-size: 1rem; font-weight: 800; color: #f59e0b;">${s.score}</span></td>
      <td><span class="badge ${s.rank === 1 ? 'warning' : 'info'}">${s.badge}</span></td>
    </tr>
  `).join('');
}
