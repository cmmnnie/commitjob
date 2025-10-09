# Python 3.11 베이스 이미지
FROM python:3.11-slim

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libu2f-udev \
    libvulkan1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# Python 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 파일 복사
COPY catch_scraper.py .

# 환경 변수 설정
ENV CHROME_BIN=/usr/bin/chromium
ENV PORT=3000

# 포트 노출
EXPOSE 3000

# 애플리케이션 실행
CMD ["python", "-u", "catch_scraper.py"]
