# Python Slim Base (CPU)
FROM python:3.10-slim-bullseye AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libgl1 \
        libglib2.0-0 \
        libpq-dev \
        git \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python Deps
FROM base AS python-deps

COPY requirements.txt .

# Install PyTorch with GPU support first
RUN pip install --no-cache-dir \
    torch==2.3.1 \
    torchvision==0.18.1 \
    torchaudio==2.3.1 \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Install lapx BEFORE ultralytics tries auto-install
RUN pip install --no-cache-dir lapx

# Install the rest of the Python dependencies from PyPI
RUN pip install --no-cache-dir -r requirements.txt

# Final Runtime Image
FROM base AS final

# Copy installed packages
COPY --from=python-deps /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy app source
COPY app ./app

ENV PYTHONPATH=/app

# Create non-root user
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
