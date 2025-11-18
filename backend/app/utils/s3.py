import os
import boto3
import logging
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)


def download_file_from_s3(bucket_name: str, file_key: str, local_path: str) -> str:
    """
    Downloads a file from S3 to a local temp path if it doesn't exist.
    Returns the local path.
    """

    try:
        logger.info(f"[S3_DOWNLOAD] Checking for existing file at: {local_path}")
        # If the file already exists, no need to re-download.
        if os.path.exists(local_path):
            logger.info(f"File already exists at {local_path}. Skipping download.")
            return local_path

        logger.info(
            f"[S3_DOWNLOAD] Attempting to download s3://{bucket_name}/{file_key} to {local_path}"
        )
        s3_client = boto3.client("s3")
        
        # Ensure the directory for the local path exists before downloading
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        logger.info("[S3_DOWNLOAD] Executing boto3 download_file...")
        s3_client.download_file(bucket_name, file_key, local_path)
        logger.info(f"✅ Successfully downloaded file to {local_path}")
        return local_path

    except NoCredentialsError:
        logger.error("[S3_DOWNLOAD] ❌ No AWS credentials found. Cannot access S3.")
        raise RuntimeError(
            "AWS credentials not configured. Please check IAM role and permissions."
        )
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        logger.error(f"[S3_DOWNLOAD] ❌ ClientError occurred: {error_code} - {e}")
        if error_code == "404":
            raise RuntimeError(
                f"File '{file_key}' not found in S3 bucket '{bucket_name}'."
            )
        elif error_code == "403":
            raise RuntimeError(
                f"Access denied for s3://{bucket_name}/{file_key}. Check IAM permissions."
            )
        else:
            raise RuntimeError(f"Could not access S3 file. AWS ClientError: {e}")
    except Exception as e:
        logger.error(f"❌ An unexpected error occurred during S3 download: {repr(e)}")
        raise RuntimeError(
            f"An unexpected error occurred while fetching the file: {repr(e)}"
        )
