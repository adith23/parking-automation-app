import os
import json
import boto3
import logging
from computer_vision_services import computer_vision_service

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Get SQS queue URL and other settings from environment variables
# These will be set in your ECS Task Definition
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
MAX_MESSAGES = int(os.environ.get("MAX_MESSAGES", 1))
WAIT_TIME_SECONDS = int(os.environ.get("WAIT_TIME_SECONDS", 10))

# --- SQS Client ---
sqs = boto3.client("sqs", region_name=AWS_REGION)

def main():
    """Main loop to poll SQS for messages and process them."""
    logging.info(f"Worker starting. Polling SQS queue: {SQS_QUEUE_URL}")

    while True:
        try:
            # Long-poll for messages from the SQS queue
            response = sqs.receive_message(
                QueueUrl=SQS_QUEUE_URL,
                MaxNumberOfMessages=MAX_MESSAGES,
                WaitTimeSeconds=WAIT_TIME_SECONDS,
                AttributeNames=['All'],
                MessageAttributeNames=['All']
            )

            messages = response.get("Messages", [])
            if not messages:
                logging.info("No messages in queue. Waiting...")
                continue

            for message in messages:
                receipt_handle = message['ReceiptHandle']
                try:
                    logging.info(f"Received message: {message['MessageId']}")
                    # The message body should contain the task details (e.g., S3 key)
                    task_data = json.loads(message['Body'])
                    
                    # --- Call your actual CV logic here ---
                    # Example: computer_vision_service.process_video_from_s3(task_data['s3_key'])
                    logging.info(f"Processing task with data: {task_data}")
                    computer_vision_service.process_task(task_data) # Assuming you have a function like this

                    # If processing is successful, delete the message from the queue
                    sqs.delete_message(
                        QueueUrl=SQS_QUEUE_URL,
                        ReceiptHandle=receipt_handle
                    )
                    logging.info(f"Successfully processed and deleted message: {message['MessageId']}")

                except Exception as e:
                    logging.error(f"Error processing message {message['MessageId']}: {e}", exc_info=True)
                    # In a real-world scenario, you might move this to a Dead-Letter Queue (DLQ)
                    # instead of just letting it become visible again after the timeout.

        except Exception as e:
            logging.error(f"An error occurred in the main loop: {e}", exc_info=True)


if __name__ == "__main__":
    if not SQS_QUEUE_URL:
        logging.error("FATAL: SQS_QUEUE_URL environment variable not set. Exiting.")
    else:
        main()