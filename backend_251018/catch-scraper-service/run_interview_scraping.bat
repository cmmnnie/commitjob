@echo off
echo ============================================================
echo 면접 기출질문 스크래핑 시작
echo 대상: Jobs 테이블의 모든 고유 회사
echo ============================================================
echo.

cd /d C:\AI\mini\project\backend\catch-scraper-service

echo 현재 디렉토리: %CD%
echo.

echo Python 버전 확인...
python --version
echo.

echo Catch.co.kr 로그인 및 스크래핑 시작...
echo (완료까지 약 2~3시간 소요됩니다)
echo.

python scrape_interview_questions.py

echo.
echo ============================================================
echo 스크래핑 완료!
echo ============================================================
echo.

pause
