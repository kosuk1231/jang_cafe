/* ================================
   장카페 대시보드 — APP.JS
   ================================ */

// Google Apps Script 웹 앱 배포 URL (app.js 와 동일한 URL)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweYFH2HJYzAQgfabDPFD8P5eTV8dGDlnfdukS_s_umcJ2On0wSSSDxqQhwL3JUSK4BrA/exec';

const dashboardGrid = document.getElementById('dashboard');
const loadingState = document.getElementById('loading');

// DOM Elements for Stats
const totalRevenueEl = document.getElementById('totalRevenue');
const totalOrdersEl = document.getElementById('totalOrders');
const hotCountEl = document.getElementById('hotCount');
const icedCountEl = document.getElementById('icedCount');
const ordersTableBody = document.getElementById('ordersTableBody');
const ordersSummaryText = document.getElementById('ordersSummaryText');
const refreshBtn = document.getElementById('refreshBtn');

// Chart instances
let menuChartObj = null;
let tempChartObj = null;

async function fetchStats() {
  try {
    loadingState.style.display = 'flex';
    dashboardGrid.style.display = 'none';

    // 캐시 방지를 위한 타임스탬프 추가
    const res = await fetch(`${SCRIPT_URL}?action=getStats&_t=${new Date().getTime()}`);
    const json = await res.json();

    if (json.result === 'success') {
      const dbData = json.data;
      // 첫번째 행은 헤더이므로 제외
      const rows = dbData.slice(1);
      processAndRender(rows);
    } else {
      loadingState.innerHTML = `<p style="color:var(--danger)">데이터를 불러오는데 실패했습니다: ${json.message}</p>`;
    }
  } catch (err) {
    loadingState.innerHTML = `<p style="color:var(--danger)">네트워크 오류가 발생했습니다.<br/>(웹 앱이 '모든 사용자' 권한으로 배포되었는지 확인해주세요.)</p>`;
    console.error(err);
  }
}

function processAndRender(rows) {
  let totalRevenue = 0;
  let hotOrders = 0;
  let icedOrders = 0;
  const menuCounts = {};

  // 최신 데이터 우선 정렬 (기본적으로 배열의 원본 보존 후 역순 렌더링)
  const reversedRows = [...rows].reverse();

  // 테이블 행 생성용
  let tableHTML = '';

  rows.forEach(row => {
    // row = [주문시각, 주문자, 온도, 메뉴(콤마로 구분), 합계(원)]
    const time = row[0];
    const name = row[1];
    const temp = row[2];
    const itemsStr = row[3];
    const price = Number(row[4]) || 0;

    totalRevenue += price;

    if (temp === 'HOT') hotOrders++;
    else if (temp === 'ICED') icedOrders++;

    // Items 가공 (ex: "이천쌀라떼, 쌍화차")
    if (itemsStr && typeof itemsStr === 'string') {
      const items = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
      items.forEach(item => {
        menuCounts[item] = (menuCounts[item] || 0) + 1;
      });
    }
  });

  // 테이블 HTML 작성
  let summaryHTML = '';

  // Data processing and table construction
  reversedRows.forEach((row, revIndex) => {
    // 실제 시트 상의 원본 인덱스는 row 배열이 아님.
    // map을 돌린게 아니므로 여기서 계산해야 함.
    // 현재 rows 배치는 원본 시트순. reversedRows는 역순.
    // revIndex가 0이면 rows 배열의 제일 끝 요소. (rows.length - 1 - revIndex)
    // 원본 시트의 Row 번호 (헤더 제외) = (rows.length - 1 - revIndex) + 2

    const sheetRowId = (rows.length - 1 - revIndex) + 2;

    const time = row[0];
    const name = row[1];
    const temp = row[2];
    const itemsStr = row[3];
    const price = Number(row[4]) || 0;
    
    // 요약 콤포넌트 구성을 위해 추가
    if (name && itemsStr) {
      summaryHTML += `<span class="summary-tag"><strong>${name}</strong>: ${itemsStr}</span>`;
    }

    const tempClass = temp === 'HOT' ? 'temp-hot' : 'temp-iced';

    tableHTML += `
      <tr>
        <td>${time}</td>
        <td><strong>${name}</strong></td>
        <td><span class="temp-badge ${tempClass}">${temp}</span></td>
        <td>${itemsStr}</td>
        <td class="text-right"><strong>${price.toLocaleString()}원</strong></td>
        <td class="text-center"><button class="delete-btn" onclick="deleteOrder(${sheetRowId})">삭제</button></td>
      </tr>
    `;
  });

  // 화면 반영
  totalRevenueEl.textContent = totalRevenue.toLocaleString() + '원';
  totalOrdersEl.textContent = rows.length + '건';
  hotCountEl.textContent = hotOrders + '건';
  icedCountEl.textContent = icedOrders + '건';
  ordersSummaryText.innerHTML = summaryHTML || '주문 내역이 없습니다.';
  ordersTableBody.innerHTML = tableHTML || '<tr><td colspan="6" class="text-center">주문 내역이 없습니다.</td></tr>';

  // 메뉴 카운트 정렬 (Top 5)
  const sortedMenu = Object.entries(menuCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const menuLabels = sortedMenu.map(x => x[0]);
  const menuData = sortedMenu.map(x => x[1]);

  renderCharts(menuLabels, menuData, hotOrders, icedOrders);

  loadingState.style.display = 'none';
  dashboardGrid.style.display = 'flex';
}

function renderCharts(menuLabels, menuData, hot, iced) {
  Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
  Chart.defaults.color = '#5A4030';

  // Destroy previous instances if any
  if (menuChartObj) menuChartObj.destroy();
  if (tempChartObj) tempChartObj.destroy();

  // Menu Bar Chart
  const ctxMenu = document.getElementById('menuChart').getContext('2d');
  menuChartObj = new Chart(ctxMenu, {
    type: 'bar',
    data: {
      labels: menuLabels,
      datasets: [{
        label: '주문 수량',
        data: menuData,
        backgroundColor: '#C8922A',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });

  // Temp Doughnut Chart
  const ctxTemp = document.getElementById('tempChart').getContext('2d');
  tempChartObj = new Chart(ctxTemp, {
    type: 'doughnut',
    data: {
      labels: ['HOT', 'ICED'],
      datasets: [{
        data: [hot, iced],
        backgroundColor: ['#ef4444', '#0ea5e9'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function deleteOrder(rowId) {
  if (!confirm('정말로 이 주문을 취소/삭제하시겠습니까? (복구할 수 없습니다)')) return;

  try {
    loadingState.style.display = 'flex';
    dashboardGrid.style.display = 'none';

    // 삭제 실행
    const res = await fetch(`${SCRIPT_URL}?action=deleteRow&row=${rowId}&_t=${new Date().getTime()}`);
    const json = await res.json();

    if (json.result === 'success') {
      alert('주문이 성공적으로 삭제되었습니다.');
      fetchStats(); // 재랜더링
    } else {
      alert('삭제 중 오류가 발생했습니다: ' + json.message);
      fetchStats();
    }
  } catch (err) {
    alert('네트워크 오류가 발생했습니다. Apps Script 배포를 최신 버전으로 업데이트했는지 확인해주세요.');
    console.error(err);
    fetchStats();
  }
}

refreshBtn.addEventListener('click', fetchStats);

// 초기 실행
fetchStats();
