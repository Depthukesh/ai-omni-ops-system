FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/ \
    JJYB_DISABLE_DESKTOP=1 \
    APP_HOST=0.0.0.0 \
    APP_PORT=5000

WORKDIR /app

COPY pip.conf /etc/pip.conf

RUN sed -i 's|http://deb.debian.org/debian|https://mirrors.aliyun.com/debian|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|http://deb.debian.org/debian-security|https://mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list.d/debian.sources

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    espeak-ng \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libsndfile1 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install --index-url https://download.pytorch.org/whl/cpu \
    "torch>=2.0.0" "torchvision>=0.15.0" "torchaudio>=2.0.0" && \
    python -m pip install -r requirements.txt

COPY . .

RUN mkdir -p \
    /app/database \
    /app/logs \
    /app/models \
    /app/output \
    /app/outputs \
    /app/storage \
    /app/temp \
    /app/uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD curl --fail http://127.0.0.1:5000/api/health || exit 1

CMD ["python", "frontend/app.py"]