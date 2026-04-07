// =============================================
// 장카페 주문서 → Google Sheets 연동
// Google Apps Script (Code.gs)
// =============================================
//
// 사용법:
// 1. https://script.google.com 접속
// 2. 새 프로젝트 생성
// 3. 아래 코드 전체 붙여넣기
// 4. SHEET_ID를 실제 스프레드시트 ID로 교체
// 5. 저장 후 → 배포 → 새 배포 → 웹 앱
//    - 실행 계정: 나(Google 계정)
//    - 액세스 권한: 모든 사용자
// 6. 배포 후 생성된 URL을 app.js의 SCRIPT_URL에 붙여넣기
// =============================================

const SHEET_ID = '1wFkyU9i3sFnxuyMKIwpP-dP2zdVmLCLLGprU8wSe3FA';
const SHEET_NAME = '주문내역'; // 시트 탭 이름

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // 시트가 없으면 생성 + 헤더
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['주문시각', '주문자', '온도', '메뉴', '합계(원)']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }

    const { timestamp, name, temp, items, total } = e.parameter;

    sheet.appendRow([
      timestamp || new Date().toLocaleString('ko-KR'),
      name || '',
      temp || '',
      items || '',
      Number(total) || 0,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
