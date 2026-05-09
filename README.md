# duobook 💑 — 부부 가계부

로그인 없이 URL로 공유하는 부부 가계부 웹앱.

## 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.local.example .env.local
```
`.env.local`에 Supabase URL과 키를 입력하세요.

### 3. Supabase 설정

Supabase 대시보드 → SQL Editor에서 아래 파일 실행:
```
supabase/migrations/001_initial.sql
```

**Realtime 설정** (대시보드에서 추가로 필요):
- Database → Replication → `transactions`, `categories` 테이블 활성화

### 4. 개발 서버 실행
```bash
npm run dev
```

## 사용 방법

1. `http://localhost:3000` 접속 → 새 가계부 자동 생성 → `/[uuid]` 로 이동
2. 설정 페이지에서 URL 복사 → 파트너에게 공유
3. 파트너가 해당 URL로 접속하면 같은 가계부 사용 가능
4. 재방문 시 `localStorage`에 저장된 가계부로 자동 이동

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL + Realtime)
- **Zustand** (상태 관리)
- **Recharts** (통계 차트)

## 주요 기능

- 수입/지출 내역 추가·수정·삭제
- 실시간 동기화 (파트너 화면에 즉시 반영)
- 달력 뷰 (날짜별 지출 시각화)
- 월별 통계 (도넛 차트 + 바 차트)
- 예산 목표 설정 및 진행 바
- 고정 지출/수입 관리
- 지출 분담 정산 자동 계산

## 배포 (Vercel)

```bash
vercel
```
환경변수를 Vercel 대시보드에도 동일하게 설정하세요.
