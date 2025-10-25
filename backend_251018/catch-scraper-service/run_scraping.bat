@echo off
echo ============================================================
echo Catch.co.kr 채용공고 스크래핑 시작
echo ============================================================
echo.

cd /d C:\AI\mini\project\backend\catch-scraper-service

echo 현재 디렉토리: %CD%
echo.

echo Python 버전 확인...
python --version
echo.

echo 스크래핑 시작...
echo (완료까지 약 30분~1시간 소요됩니다)
echo.

python scrape_2000_jobs_real.py

echo.
echo ============================================================
echo 스크래핑 완료!
echo ============================================================
echo.

pause
