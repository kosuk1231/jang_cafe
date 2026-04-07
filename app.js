/* ================================
   장카페 주문서 — APP.JS
   Google Sheets 연동 포함
   ================================ */

// ── Google Sheets 설정 ──────────────────────────────────
// 아래 두 값을 실제 값으로 교체하세요.
// SHEET_ID: 스프레드시트 URL의 /d/XXXX/edit 부분의 XXXX
// SCRIPT_URL: Google Apps Script 웹 앱 배포 URL
const SHEET_ID = '1wFkyU9i3sFnxuyMKIwpP-dP2zdVmLCLLGprU8wSe3FA';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweYFH2HJYzAQgfabDPFD8P5eTV8dGDlnfdukS_s_umcJ2On0wSSSDxqQhwL3JUSK4BrA/exec'; // ← Apps Script 배포 후 URL 입력

// ── 메뉴 데이터 ──────────────────────────────────────────
// hot: HOT 가격(원), ice: ICED 가격(원), null = 해당 없음
const MENU = [
  { name: '이천쌀라떼',         hot: 2500, ice: 2500 },
  { name: '전통다과\n(약과+유과)', hot: null, ice: 2500 },
  { name: '쌍화차',             hot: 1900, ice: null },
  { name: '천마차',             hot: null, ice: 2500 },
  { name: '연잎차',             hot: 2500, ice: 2500 },
  { name: '하동매실차',         hot: 3000, ice: 3000 },
  { name: '수제 배도라지차',    hot: 3500, ice: null },
  { name: '자몽꿀홍차',         hot: 3500, ice: 3500 },
  { name: '살구에이드',         hot: null, ice: 3000 },
  { name: '더블베리에이드',     hot: null, ice: 3000 },
  { name: '백향과에이드',       hot: null, ice: 3000 },
];

// ── 상태 ─────────────────────────────────────────────────
let currentTemp = 'HOT';

// ── DOM 참조 ─────────────────────────────────────────────
const customerName  = document.getElementById('customerName');
const menuGrid      = document.getElementById('menuGrid');
const summaryName   = document.getElementById('summaryName');
const summaryTemp   = document.getElementById('summaryTemp');
const summaryItems  = document.getElementById('summaryItems');
const summaryTotal  = document.getElementById('summaryTotal');
const submitBtn     = document.getElementById('submitBtn');
const modalOverlay  = document.getElementById('modalOverlay');
const rcptName      = document.getElementById('rcptName');
const rcptTemp      = document.getElementById('rcptTemp');
const rcptItems     = document.getElementById('rcptItems');
const rcptTotal     = document.getElementById('rcptTotal');
const rcptStatus    = document.getElementById('rcptStatus');
const closeModalBtn = document.getElementById('closeModal');
const printModalBtn = document.getElementById('printModal');
const toast         = document.getElementById('toast');

// ── 메뉴 그리드 렌더링 ──────────────────────────────────
function renderMenu() {
  const available = MENU.filter(m =>
    currentTemp === 'HOT' ? m.hot !== null : m.ice !== null
  );

  menuGrid.innerHTML = available.map((m, i) => {
    const price = currentTemp === 'HOT' ? m.hot : m.ice;
    const safeName = m.name.replace(/\n/g, '<br/>');
    return `
      <label class="menu-item">
        <input type="checkbox" name="menu" data-name="${m.name.replace(/\n/g,'')}" data-price="${price}" />
        <span class="menu-card">
          <span class="menu-name">${safeName}</span>
          <span class="menu-price">${price.toLocaleString()}원</span>
        </span>
      </label>
    `;
  }).join('');

  // 체크박스 이벤트 재등록
  document.querySelectorAll('input[name="menu"]').forEach(cb =>
    cb.addEventListener('change', updateSummary)
  );

  updateSummary();
}

// ── HOT / ICED 토글 ──────────────────────────────────────
document.querySelectorAll('.temp-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTemp = btn.dataset.temp;
    summaryTemp.textContent = currentTemp;
    renderMenu();
  });
});

// ── 주문 요약 업데이트 ───────────────────────────────────
function updateSummary() {
  const name = customerName.value.trim();
  const checked = [...document.querySelectorAll('input[name="menu"]:checked')];

  summaryName.textContent = name || '—';

  if (checked.length === 0) {
    summaryItems.innerHTML = '<p class="empty-msg">메뉴를 선택해주세요</p>';
  } else {
    summaryItems.innerHTML = checked.map(c => `
      <div class="summary-item-row">
        <span class="s-name">${c.dataset.name}</span>
        <span class="s-price">${Number(c.dataset.price).toLocaleString()}원</span>
      </div>
    `).join('');
  }

  const total = checked.reduce((s, c) => s + Number(c.dataset.price), 0);
  summaryTotal.textContent = total.toLocaleString() + '원';
  submitBtn.disabled = !(name && checked.length > 0);
}

customerName.addEventListener('input', updateSummary);

// ── 주문하기 ─────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  const name = customerName.value.trim();
  const checked = [...document.querySelectorAll('input[name="menu"]:checked')];
  const total = checked.reduce((s, c) => s + Number(c.dataset.price), 0);
  const now = new Date().toLocaleString('ko-KR');

  // 영수증 채우기
  rcptName.textContent = name;
  rcptTemp.textContent = currentTemp;
  rcptItems.innerHTML = checked.map(c => `
    <div class="rcpt-item-row">
      <span>${c.dataset.name}</span>
      <span>${Number(c.dataset.price).toLocaleString()}원</span>
    </div>
  `).join('');
  rcptTotal.textContent = total.toLocaleString() + '원';
  rcptStatus.textContent = '기록 중...';
  rcptStatus.className = '';

  modalOverlay.classList.add('open');

  // Google Sheets 전송
  await sendToSheets({
    timestamp: now,
    name,
    temp: currentTemp,
    items: checked.map(c => c.dataset.name).join(', '),
    total,
  });
});

// ── Google Sheets 전송 ───────────────────────────────────
async function sendToSheets(data) {
  if (!SCRIPT_URL) {
    rcptStatus.textContent = '✅ 주문 완료! (시트 연동 미설정)';
    rcptStatus.className = 'success';
    return;
  }

  try {
    const params = new URLSearchParams({
      timestamp: data.timestamp,
      name: data.name,
      temp: data.temp,
      items: data.items,
      total: String(data.total),
    });

    await fetch(`${SCRIPT_URL}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });

    rcptStatus.textContent = '✅ 구글 시트에 기록되었습니다';
    rcptStatus.className = 'success';
    showToast('주문이 기록되었습니다 ✅');
  } catch (err) {
    rcptStatus.textContent = '⚠️ 시트 전송 실패 — 수동으로 기록해 주세요';
    rcptStatus.className = 'error';
    console.error(err);
  }
}

// ── 모달 닫기 ─────────────────────────────────────────────
closeModalBtn.addEventListener('click', () => {
  modalOverlay.classList.remove('open');
  // 주문 초기화
  customerName.value = '';
  document.querySelectorAll('input[name="menu"]:checked')
    .forEach(cb => { cb.checked = false; });
  updateSummary();
});

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

printModalBtn.addEventListener('click', () => window.print());

// ── 토스트 ───────────────────────────────────────────────
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── 초기화 ───────────────────────────────────────────────
renderMenu();
