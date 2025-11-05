import cv2
import json
import numpy as np
from ultralytics import YOLO
import easyocr
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis import get_redis
from app.models.owner_models.parking_slot_model import ParkingSlot
from app.services.session_service import session_service

# --- Configuration and Model Paths ---
VEHICLE_MODEL_PATH = "yolo11n.pt"
LPR_MODEL_PATH = "license-plate-finetune-v1n.pt"


def cleanup_plate_text(raw_text):
    """Cleans the raw OCR text to get a more accurate license plate number."""
    if not raw_text:
        return ""
    return re.sub(r"[^A-Z0-9]", "", raw_text).upper()


OCCUPIED_FRAME_THRESHOLD = 3
EMPTY_FRAME_THRESHOLD = 3


class ComputerVisionService:
    """
    A class to encapsulate all computer vision logic for the smart parking system.
    Initializes models once and provides a method to process individual video frames.
    """

    def __init__(self, parking_slots: List[Dict[str, np.ndarray]]):
        """
        Initializes the Computer Vision service.

        Args:
            parking_slots_polygons (list): A list of polygons (as numpy arrays)
                                           representing the parking slots.
        """
        print("✅ Initializing Computer Vision Service...")

        # --- Model Initialization ---
        self.vehicle_model = YOLO(VEHICLE_MODEL_PATH)
        try:
            self.lpr_model = YOLO(LPR_MODEL_PATH)
        except Exception as e:
            print(f"⚠️ Error loading license plate model: {e}")
            raise  # Re-raise the exception to stop the service if the model fails

        # Initialize OCR reader. Consider specifying the GPU device if you have multiple.
        self.reader = easyocr.Reader(["en"], gpu=True)
        print("✅ Models loaded successfully.")

        # --- State Variables ---
        self.slots: Dict[int, Dict[str, Any]] = {}
        for slot in parking_slots:
            polygon = slot["polygon"]
            state = {
                "slot_id": slot["slot_id"],
                "parking_lot_id": slot["parking_lot_id"],
                "polygon": polygon,
                "flat_polygon": polygon.reshape(-1, 2),
                "status": slot.get("status", "available"),
                "last_published_status": slot.get("status", "available"),
                "occupied_count": 0,
                "empty_count": 0,
                "label": slot.get("label", f"Slot {slot['slot_id']}"),
            }
            self.slots[slot["slot_id"]] = state

        self.mutable_statuses = {"available", "occupied"}
        self.best_vehicle_plates = {}
        # Track which license plate is in which slot: {slot_id: license_plate}
        self.slot_license_plates: Dict[int, str] = {}

    def process_frame(self, frame):
        """
        Processes a single video frame to detect vehicles, read license plates,
        and determine parking slot occupancy.

        Args:
            frame (np.ndarray): The video frame to process.

        Returns:
            np.ndarray: The frame with annotations (bounding boxes, polygons, text) drawn on it.
        """
        annotated_frame = frame.copy()

        # 1. Track Vehicles
        vehicle_results = self.vehicle_model.track(
            frame, persist=True, tracker="bytetrack.yaml", verbose=False
        )
        tracked_vehicles = []
        if (
            vehicle_results[0].boxes is not None
            and vehicle_results[0].boxes.id is not None
        ):
            tracked_vehicles = vehicle_results[0].boxes.data.cpu().numpy()

        # 2. Detect License Plates
        lpr_results = self.lpr_model(frame, verbose=False)
        plate_boxes = (
            lpr_results[0].boxes.xyxy.cpu().numpy()
            if lpr_results[0].boxes is not None
            else []
        )

        # 3. OCR Logic with Continuous Confidence Checking
        for plate_box in plate_boxes:
            px1, py1, px2, py2 = map(int, plate_box)
            for vehicle in tracked_vehicles:
                vx1, vy1, vx2, vy2, track_id = map(int, vehicle[:5])
                # Check if plate center is inside vehicle box
                if vx1 < (px1 + px2) / 2 < vx2 and vy1 < (py1 + py2) / 2 < vy2:
                    plate_crop = frame[py1:py2, px1:px2]
                    ocr_result = self.reader.readtext(plate_crop)
                    if ocr_result:
                        plate_text = cleanup_plate_text(ocr_result[0][1])
                        confidence = ocr_result[0][2]
                        if plate_text:
                            if (
                                track_id not in self.best_vehicle_plates
                                or confidence
                                > self.best_vehicle_plates[track_id]["confidence"]
                            ):
                                self.best_vehicle_plates[track_id] = {
                                    "text": plate_text,
                                    "confidence": confidence,
                                }
                    break

        # 4. Occupancy and Drawing Logic
        for state in self.slots.values():
            slot_id = state["slot_id"]
            flat_polygon = state["flat_polygon"]

            if state["last_published_status"] not in self.mutable_statuses:
                current_status = state["last_published_status"]
            else:
                occupied = False
                detected_license_plate = None

                # Check which vehicles are in this slot and get their license plates
                for vehicle in tracked_vehicles:
                    vx1, vy1, vx2, vy2, track_id = map(int, vehicle[:5])
                    center_x, center_y = (vx1 + vx2) / 2, (vy1 + vy2) / 2
                    if (
                        cv2.pointPolygonTest(flat_polygon, (center_x, center_y), False)
                        >= 0
                    ):
                        occupied = True
                        # Get license plate for this vehicle if available
                        if track_id in self.best_vehicle_plates:
                            detected_license_plate = self.best_vehicle_plates[track_id][
                                "text"
                            ]
                            # Store license plate for this slot
                            self.slot_license_plates[slot_id] = detected_license_plate
                        break

                if occupied:
                    state["occupied_count"] += 1
                    state["empty_count"] = 0
                    if (
                        state["status"] != "occupied"
                        and state["occupied_count"] >= OCCUPIED_FRAME_THRESHOLD
                    ):
                        state["status"] = "occupied"
                        # If transitioning to occupied and we have a license plate, try to detect arrival
                        if detected_license_plate:
                            try:
                                session_service.detect_license_plate_arrival(
                                    detected_license_plate,
                                    slot_id,
                                    datetime.now(timezone.utc),
                                )
                            except Exception as e:
                                print(f"Error detecting license plate arrival: {e}")
                else:
                    state["empty_count"] += 1
                    state["occupied_count"] = 0
                    # Clear license plate when slot becomes empty
                    if slot_id in self.slot_license_plates:
                        del self.slot_license_plates[slot_id]
                    if (
                        state["status"] != "available"
                        and state["empty_count"] >= EMPTY_FRAME_THRESHOLD
                    ):
                        state["status"] = "available"

                current_status = state["status"]

                if current_status != state["last_published_status"]:
                    # Get license plate for this slot if available
                    license_plate = self.slot_license_plates.get(slot_id)
                    self._handle_status_change(state, current_status, license_plate)
                    state["last_published_status"] = current_status

            color = self._status_color(current_status)
            label = self._status_label(state)
            cv2.polylines(
                annotated_frame,
                [state["polygon"]],
                isClosed=True,
                color=color,
                thickness=2,
            )
            text_pos = (
                int(np.min(flat_polygon[:, 0])),
                int(np.min(flat_polygon[:, 1]) - 5),
            )
            cv2.putText(
                annotated_frame,
                label,
                text_pos,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                2,
            )

        # Draw vehicle boxes and license plates
        for vehicle in tracked_vehicles:
            vx1, vy1, vx2, vy2, track_id = map(int, vehicle[:5])
            cv2.rectangle(annotated_frame, (vx1, vy1), (vx2, vy2), (255, 0, 0), 2)
            label = f"ID: {track_id}"
            if track_id in self.best_vehicle_plates:
                best_plate = self.best_vehicle_plates[track_id]
                label += (
                    f" Plate: {best_plate['text']} ({best_plate['confidence']:.2f})"
                )
            cv2.putText(
                annotated_frame,
                label,
                (vx1, vy1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2,
            )

        return annotated_frame

    def _handle_status_change(
        self, state: Dict[str, Any], new_status: str, license_plate: str = None
    ) -> None:
        observed_at = datetime.now(timezone.utc)
        slot_id = state["slot_id"]
        old_status = state["last_published_status"]

        db: Session = SessionLocal()
        try:
            db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).update(
                {"status": new_status, "last_updated_at": observed_at},
                synchronize_session=False,
            )
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

        # Integrate with session service to handle slot status changes
        try:
            session_service.handle_slot_status_change(
                slot_id, old_status, new_status, license_plate
            )
        except Exception as e:
            print(f"Error handling slot status change in session service: {e}")

        payload = {
            "slot_id": slot_id,
            "parking_lot_id": state["parking_lot_id"],
            "status": new_status,
            "observed_at": observed_at.isoformat(),
        }

        redis_client = get_redis()
        if redis_client is not None:
            try:
                redis_client.publish(
                    settings.REDIS_AVAILABILITY_CHANNEL, json.dumps(payload)
                )
            except Exception:
                pass

    def _status_color(self, status: str) -> tuple[int, int, int]:
        mapping = {
            "available": (0, 255, 0),
            "occupied": (0, 0, 255),
            "reserved": (0, 215, 255),
            "unavailable": (128, 128, 128),
        }
        return mapping.get(status, (255, 255, 255))

    def _status_label(self, state: Dict[str, Any]) -> str:
        base = state.get("label", f"Slot {state['slot_id']}")
        status = state.get("last_published_status", state.get("status", "unknown"))
        return f"{base} ({status})"


# --- Standalone Execution for Testing ---
# This block allows you to run this file directly to test the CV service
# without needing the FastAPI server. It's very useful for debugging.
if __name__ == "__main__":
    VIDEO_PATH = "sample_video.mp4"
    SLOTS_PATH = "parking_slots.json"

    def load_parking_slots(file_path):
        try:
            with open(file_path, "r") as f:
                slots_data = json.load(f)
                definitions = []
                for idx, feature in enumerate(slots_data["features"], start=1):
                    coords = np.array(
                        feature["geometry"]["coordinates"][0], np.int32
                    ).reshape((-1, 1, 2))
                    definitions.append(
                        {
                            "slot_id": idx,
                            "parking_lot_id": 0,
                            "polygon": coords,
                            "status": feature.get("properties", {}).get(
                                "status", "available"
                            ),
                            "label": feature.get("properties", {}).get(
                                "slot_number", f"Slot {idx}"
                            ),
                        }
                    )
                return definitions
        except FileNotFoundError:
            print(f"Error: Parking slots file not found at {file_path}")
            return []

    # 1. Load data
    parking_slot_defs = load_parking_slots(SLOTS_PATH)
    if not parking_slot_defs:
        exit()

    # 2. Initialize the service
    cv_service = ComputerVisionService(parking_slots=parking_slot_defs)

    # 3. Run the processing loop
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"Error: Cannot open video {VIDEO_PATH}")
        exit()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Video stream ended.")
            break

        # 4. Process each frame using the service
        processed_frame = cv_service.process_frame(frame)

        cv2.imshow("Smart Parking System - ALPR (Test)", processed_frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("✅ Processing complete.")
