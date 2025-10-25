@echo off
echo ============================================================
echo 회사 정보 스크래핑 시작
echo 대상: Jobs 테이블의 모든 고유 회사 (434개)
echo ============================================================
echo.

cd /d C:\AI\mini\project\backend\catch-scraper-service

echo 현재 디렉토리: %CD%
echo.

echo Python 버전 확인...
python --version
echo.

echo 스크래핑 시작...
echo (완료까지 약 1~1.5시간 소요됩니다)
echo.

python scrape_company_info.py

echo.
echo ============================================================
echo 스크래핑 완료!
echo ============================================================
echo.

pause
