# 장카페 주문서

종로종합사회복지관 **장카페** 메뉴 주문 웹 앱입니다.

## 기능
- 주문자 이름 입력
- HOT / ICED 온도 선택 → 해당 메뉴만 자동 표시
- 메뉴 선택 (복수 선택 가능)
- 실시간 합계 표시
- 주문 완료 영수증 팝업 + 인쇄
- **Google Sheets 자동 기록** (설정 필요)

## Google Sheets 연동 설정

### 1. Apps Script 설정
1. https://script.google.com 접속 → 새 프로젝트
2. `Code.gs` 내용 전체 붙여넣기 → 저장

### 2. 웹 앱 배포
1. 배포 → 새 배포 → 웹 앱
2. 실행 계정: 나 / 액세스: 모든 사용자
3. 배포 후 URL 복사

### 3. app.js에 URL 입력
```js
const SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXX/exec';
```

## GitHub Pages 배포
Settings → Pages → Source: main 브랜치, / (root)
