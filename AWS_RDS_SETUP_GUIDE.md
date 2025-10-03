# AWS RDS MySQL 설정 가이드

## 1단계: AWS RDS 인스턴스 생성

### 1. AWS 콘솔 접속
- https://console.aws.amazon.com/rds/
- 리전 선택: 서울 (ap-northeast-2) 권장

### 2. 데이터베이스 생성
1. **"데이터베이스 생성"** 클릭
2. **엔진 옵션**: MySQL 선택
3. **버전**: MySQL 8.0.x (최신 안정 버전)
4. **템플릿**:
   - 프로덕션: "프로덕션"
   - 테스트: "프리 티어" (12개월 무료)

### 3. 설정
```
DB 인스턴스 식별자: commitjob-db
마스터 사용자 이름: admin
마스터 암호: [강력한 암호 설정] (예: CommitJob2024!@#)
```

### 4. 인스턴스 구성
**프리 티어**:
- DB 인스턴스 클래스: db.t3.micro (또는 db.t2.micro)
- 스토리지: 20GB (SSD)

**프로덕션**:
- DB 인스턴스 클래스: db.t3.small 이상
- 스토리지: 100GB (SSD)
- 다중 AZ 배포: 예

### 5. 연결
**퍼블릭 액세스**: 예 (Vercel에서 접근하려면 필수)

**VPC 보안 그룹**: 새로 생성
- 이름: commitjob-db-sg

### 6. 추가 구성
**초기 데이터베이스 이름**: appdb
**포트**: 3306
**백업 보존 기간**: 7일

---

## 2단계: 보안 그룹 설정 (중요!)

### RDS 보안 그룹 인바운드 규칙 추가

1. **EC2 콘솔** → **보안 그룹** → 생성된 보안 그룹 선택
2. **인바운드 규칙 편집**
3. **규칙 추가**:

```
유형: MySQL/Aurora
프로토콜: TCP
포트 범위: 3306
소스:
  - 내 IP (개발용)
  - 0.0.0.0/0 (Vercel 접근용 - 주의!)
설명: Allow MySQL from Vercel
```

**보안 주의**:
- `0.0.0.0/0`은 모든 IP를 허용하므로 보안에 취약
- 더 안전한 방법: Vercel의 IP 범위만 허용 (아래 참고)

### Vercel IP 화이트리스트 (권장)
Vercel의 송신 IP: https://vercel.com/docs/concepts/edge-network/regions

주요 리전:
```
76.76.21.0/24
76.223.126.0/24
```

---

## 3단계: 데이터베이스 생성 및 데이터 마이그레이션

### 로컬에서 RDS 접속 테스트

```bash
# MySQL 클라이언트 설치 (Mac)
brew install mysql-client

# RDS 접속
mysql -h <RDS-엔드포인트> -P 3306 -u admin -p
# 암호 입력

# 접속 성공하면:
mysql> SHOW DATABASES;
```

### 데이터베이스 사용자 생성

```sql
-- 애플리케이션용 사용자 생성
CREATE USER 'appuser'@'%' IDENTIFIED BY 'Woolim114!';

-- 권한 부여
GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- 확인
SELECT User, Host FROM mysql.user WHERE User='appuser';
```

### 로컬 DB 스키마 덤프

```bash
# 로컬 DB 스키마 추출 (데이터 제외)
mysqldump -u appuser -p --no-data --databases appdb > schema.sql

# 또는 데이터 포함
mysqldump -u appuser -p --databases appdb > full_backup.sql
```

### RDS에 스키마 임포트

```bash
# RDS에 스키마 적용
mysql -h <RDS-엔드포인트> -P 3306 -u admin -p appdb < schema.sql

# 또는 전체 백업 복원
mysql -h <RDS-엔드포인트> -P 3306 -u admin -p < full_backup.sql
```

---

## 4단계: 환경 변수 업데이트

### RDS 엔드포인트 확인
AWS RDS 콘솔 → 데이터베이스 → 연결 & 보안
```
엔드포인트: commitjob-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
포트: 3306
```

### 로컬 `.env` 파일 업데이트

```bash
# 프로덕션용
DB_HOST=commitjob-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=appuser
DB_PASS=Woolim114!
DB_NAME=appdb

# 로컬 개발용 (주석 처리)
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_USER=appuser
# DB_PASS=Woolim114!
# DB_NAME=appdb
```

### Vercel 환경 변수 설정

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 추가:

```
DB_HOST=commitjob-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=appuser
DB_PASS=Woolim114!
DB_NAME=appdb
```

**중요**: Production, Preview, Development 모두 체크

---

## 5단계: 로컬에서 RDS 연결 테스트

### Node.js 테스트 스크립트

```javascript
// test-rds-connection.js
import mysql from 'mysql2/promise';

const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'commitjob-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('RDS 연결 성공!');

    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('쿼리 테스트:', rows);

    const [tables] = await connection.execute('SHOW TABLES');
    console.log('테이블 목록:', tables);

    await connection.end();
    console.log('연결 종료');
  } catch (error) {
    console.error('RDS 연결 실패:', error);
  }
};

testConnection();
```

**실행**:
```bash
cd /Users/cmmnnie/Dev/test/캡스톤/backend
node test-rds-connection.js
```

---

## 6단계: 백엔드 서버 재시작 및 테스트

```bash
# 로컬에서 테스트
cd /Users/cmmnnie/Dev/test/캡스톤/backend
node server.js

# RDS 연결 확인 (로그에서)
# [DB] MySQL connected: commitjob-db.xxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
```

---

## 7단계: 비용 최적화 (선택 사항)

### 프리 티어 사용 (12개월 무료)
- db.t2.micro 또는 db.t3.micro
- 20GB 스토리지
- 단일 AZ

### 프로덕션 권장 사항
- db.t3.small (2 vCPU, 2GB RAM) - 월 $30~40
- 다중 AZ 배포 - 고가용성
- 자동 백업 활성화

### 비용 절감 팁
1. **예약 인스턴스**: 1년 약정 시 40% 할인
2. **개발 환경 자동 종료**: 업무 시간 외 종료 스케줄 설정
3. **스토리지 최적화**: 초기에는 작게 시작

---

## 문제 해결

### 연결 타임아웃
1. 보안 그룹 인바운드 규칙 확인
2. 퍼블릭 액세스 "예" 설정 확인
3. RDS 엔드포인트 주소 확인

### 인증 실패
1. 사용자 이름/암호 확인
2. 사용자 호스트 권한 확인 (`'appuser'@'%'`)

### 데이터베이스 없음
```sql
CREATE DATABASE IF NOT EXISTS appdb;
USE appdb;
```

---

## 참고 자료
- AWS RDS 문서: https://docs.aws.amazon.com/rds/
- Vercel IP 범위: https://vercel.com/docs/concepts/edge-network/regions
- MySQL 문서: https://dev.mysql.com/doc/
