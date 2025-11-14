# NVIDIA CUDA Base (GPU)
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04 AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-dev \
        python3-venv \
        build-essential \
        libgl1 \
        libglib2.0-0 \
        libpq-dev \
        git \
    && rm -rf /var/lib/apt/lists/*

# Make python3 default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1 && \
    update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1


# Install Python Deps
FROM base AS python-deps

COPY requirements.txt .

# Install PyTorch CUDA 11.8 FIRST (GPU)
RUN pip install --no-cache-dir \
    torch==2.3.1 \
    torchvision==0.18.1 \
    torchaudio==2.3.1 \
    --index-url https://download.pytorch.org/whl/cu118

# Install all other dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Final Runtime Image
FROM base AS final

# Copy installed packages
COPY --from=python-deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy app source
COPY app ./app

ENV PYTHONPATH=/app

# Create non-root user
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
