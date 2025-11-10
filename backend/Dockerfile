# Stage 1: Use a slim, official Python base image
FROM python:3.12-slim AS base

# Set environment variables to prevent Python from writing .pyc files and to buffer output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for Python packages like psycopg2
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install Python dependencies
FROM base AS python-deps

# Copy only the requirements file to leverage Docker layer caching
# CORRECTED PATH: Removed "./backend/"
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Final application image
FROM base AS final

# Copy installed dependencies from the previous stage
COPY --from=python-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy the application source code
# CORRECTED PATH: Removed "./backend/"
COPY app ./app

# Set the python path to include the app directory
ENV PYTHONPATH=/app

# Create a non-root user and switch to it for security
RUN useradd --create-home appuser
USER appuser

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]