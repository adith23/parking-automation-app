# Use an official NVIDIA base image with CUDA 12.4 and cuDNN, built on Ubuntu 24.04
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu24.04

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install Python 3.12 (which is default in Ubuntu 24.04), pip, venv, and awscli
# No PPA is needed.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3.12 \
    python3-pip \
    python3.12-venv \
    awscli \
    && rm -rf /var/lib/apt/lists/*

# Make python3.12 the default python
RUN ln -s /usr/bin/python3.12 /usr/bin/python

# Copy only the requirements file first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the CV worker source code and the entrypoint script
COPY . .

# Make the entrypoint script executable
RUN chmod +x ./entrypoint.sh

# This directory will be populated by the entrypoint script from S3
RUN mkdir -p /app/models

# Expose a port if your worker has a health check endpoint
EXPOSE 8001

# Set the entrypoint to our custom script
ENTRYPOINT ["./entrypoint.sh"]

# The command that the entrypoint will execute after downloading models.
CMD ["python", "main.py"]