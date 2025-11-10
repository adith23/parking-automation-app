#!/bin/sh
# filepath: c:\Projects\parking-automation-app\cv_worker\entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Model Loading ---
# Check if the MODELS_S3_URI environment variable is set.
# This variable should be configured in your ECS Task Definition (e.g., "s3://your-models-bucket/production/").
if [ -z "$MODELS_S3_URI" ]; then
  echo "Error: MODELS_S3_URI environment variable is not set."
  exit 1
fi

echo "Starting model synchronization from S3..."

# Use aws s3 sync to download models. This is efficient and only downloads new or updated files.
# The --no-progress flag keeps the logs clean.
aws s3 sync "$MODELS_S3_URI" /app/models --no-progress

echo "Model synchronization complete."

# --- Execute Main Command ---
# After the script finishes, execute the command passed as arguments to this script (the Dockerfile's CMD).
# This allows the Dockerfile CMD to be flexible.
exec "$@"