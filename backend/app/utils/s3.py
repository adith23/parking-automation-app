import os
import boto3
import logging
from botocore.exceptions import ClientErro

logger = logging.getLogger(__name__)

def download_file_from_s3(bucket_name: str, file_key: str, local_path: str) -> str:
    """
    Downloads a file from S3 to a local temp path if it doesn't exist.
    Returns the local path.
    """
    # If the file already exists, no need to re-download.
    if os.path.exists(local_path):
        logger.info(f"File already exists at {local_path}. Skipping download.")
        return local_path

    logger.info(f"Attempting to download file from S3: {bucket_name}/{file_key}")
    s3_client = boto3.client("s3")
    try:
        # Ensure the directory for the local path exists before downloading
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        s3_client.download_file(bucket_name, file_key, local_path)
        logger.info(f"✅ Successfully downloaded file to {local_path}")
        return local_path
    except ClientError as e:
        logger.error(f"❌ Failed to download file from S3: {e}")
        if e.response['Error']['Code'] == '404':
            raise RuntimeError(f"File '{file_key}' not found in S3 bucket '{bucket_name}'.")
        raise RuntimeError(f"Could not access S3 file. Error: {e}")
    except Exception as e:
        logger.error(f"❌ An unexpected error occurred during S3 download: {e}")
        raise RuntimeError("An unexpected error occurred while fetching the file.")