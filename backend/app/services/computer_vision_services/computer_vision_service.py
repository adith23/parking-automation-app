import cv2
import json
import os
import re
import io
import numpy as np
from ultralytics import YOLO
import easyocr
import re
from datetime import datetime, timezone
from typing import Any, Dict, List
from google.cloud import vision

from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis import get_redis
from app.models.owner_models.parking_slot_model import ParkingSlot
from app.services.session_service import session_service

# --- Configuration and Model Paths ---
MODEL_CACHE_DIR = "/tmp/models"
VEHICLE_MODEL_PATH = "/app/assets/yolo11n.pt"
LPR_MODEL_PATH = "/app/assets/license-plate-finetune-v1n.pt"

OCCUPIED_FRAME_THRESHOLD = 3
EMPTY_FRAME_THRESHOLD = 3
OCR_INTERVAL_SECONDS = 3


def cleanup_plate_text(raw_text: str) -> str:
    """Cleans and corrects OCR license plate text."""
    if not raw_text:
        return ""
    text = re.sub(r"[^A-Z0-9]", "", raw_text.upper())
    return text[:10]


class ComputerVisionService:
    """
    A class to encapsulate all computer vision logic for the smart parking system.
    Initializes models once and provides a method to process individual video frames.
    """

    def __init__(self, parking_slots: List[Dict[str, np.ndarray]]):

        print("✅ Initializing Computer Vision Service...")

        # --- Model Initialization ---
        self.vehicle_model = YOLO(VEHICLE_MODEL_PATH)
        self.lpr_model = YOLO(LPR_MODEL_PATH)
        self.vision_client = vision.ImageAnnotatorClient()
        print("✅ Google Vision OCR initialized successfully.")

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
        self.ocr_buffer = {}
        self.slot_license_plates: Dict[int, str] = {}

    def _calculate_crop_quality(
        self, crop: np.ndarray, detection_confidence: float
    ) -> float:
        """Calculates a quality score for a license plate crop based on sharpness, size, and detector confidence."""
        if crop is None or crop.size == 0:
            return 0.0

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        area = crop.shape[0] * crop.shape[1]

        # Normalize metrics to balance their influence
        normalized_sharpness = min(sharpness / 1000.0, 1.0)
        normalized_area = min(area / 15000.0, 1.0)

        # Weighted score
        score = (
            (detection_confidence * 0.5)
            + (normalized_sharpness * 0.3)
            + (normalized_area * 0.2)
        )
        return score

    def _google_ocr(self, image_np: np.ndarray):
        """Run Google Vision OCR on a NumPy BGR image and return text + confidence."""
        try:
            success, encoded_img = cv2.imencode(".jpg", image_np)
            if not success:
                return None, 0.0

            content = io.BytesIO(encoded_img.tobytes())
            image = vision.Image(content=content.getvalue())

            response = self.vision_client.text_detection(image=image)
            annotations = response.text_annotations

            if not annotations:
                return None

            text = annotations[0].description.strip()
            print(f"👁️ Google Vision API Result: '{text}'")
            return text

        except Exception as e:
            print(f"⚠️ Google OCR error: {e}")
            return None

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
        now = datetime.now(timezone.utc)

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
        plate_detections = (
            lpr_results[0].boxes.data.cpu().numpy()
            if lpr_results[0].boxes is not None
            else []
        )

        # 3. Assess and Buffer Best Plate Crop
        for plate_detection in plate_detections:
            px1, py1, px2, py2, plate_confidence, _ = plate_detection
            px1, py1, px2, py2 = map(int, (px1, py1, px2, py2))

            for vehicle in tracked_vehicles:
                vx1, vy1, vx2, vy2, track_id = map(int, vehicle[:5])
                if vx1 < (px1 + px2) / 2 < vx2 and vy1 < (py1 + py2) / 2 < vy2:
                    plate_crop = frame[py1:py2, px1:px2]
                    quality_score = self._calculate_crop_quality(
                        plate_crop, plate_confidence
                    )

                    if (
                        track_id not in self.ocr_buffer
                        or quality_score > self.ocr_buffer[track_id]["score"]
                    ):
                        last_time = self.ocr_buffer.get(track_id, {}).get(
                            "last_ocr_time", datetime.min.replace(tzinfo=timezone.utc)
                        )
                        self.ocr_buffer[track_id] = {
                            "crop": plate_crop.copy(),
                            "score": quality_score,
                            "last_ocr_time": last_time,
                        }
                    break

            # 4. Trigger Timed OCR for currently tracked vehicles
            for track_id in self.ocr_buffer.keys():
                if track_id in {
                    int(v[4]) for v in tracked_vehicles
                }:  # Check if vehicle is still being tracked
                    buffer_entry = self.ocr_buffer[track_id]
                    time_since_last_ocr = (
                        now - buffer_entry["last_ocr_time"]
                    ).total_seconds()

                    if time_since_last_ocr > OCR_INTERVAL_SECONDS:
                        print(
                            f"✅ Triggering timed OCR for track {track_id} (Quality: {buffer_entry['score']:.2f})"
                        )
                        raw_text = self._google_ocr(buffer_entry["crop"])

                        if raw_text:
                            plate_text = cleanup_plate_text(raw_text)
                            if plate_text:
                                self.best_vehicle_plates[track_id] = {
                                    "text": plate_text,
                                    "confidence": quality_score,
                                }

                        # Update the timestamp
                        self.ocr_buffer[track_id]["last_ocr_time"] = now

        # Clean up buffer for tracks that are no longer visible
        current_track_ids = {int(v[4]) for v in tracked_vehicles}
        for track_id in list(self.ocr_buffer.keys()):
            if track_id not in current_track_ids:
                del self.ocr_buffer[track_id]

        # 5. Occupancy and Drawing Logic
        for state in self.slots.values():
            slot_id = state["slot_id"]
            flat_polygon = state["flat_polygon"]

            if state["last_published_status"] not in self.mutable_statuses:
                current_status = state["last_published_status"]
            else:
                occupied = False
                detected_license_plate = None
                track_id_in_slot = None

                # Check which vehicles are in this slot and get their license plates
                for vehicle in tracked_vehicles:
                    vx1, vy1, vx2, vy2, track_id = map(int, vehicle[:5])
                    center_x, center_y = (vx1 + vx2) / 2, (vy1 + vy2) / 2
                    if (
                        cv2.pointPolygonTest(flat_polygon, (center_x, center_y), False)
                        >= 0
                    ):
                        occupied = True
                        track_id_in_slot = track_id
                        # Get license plate for this vehicle if available
                        if track_id in self.best_vehicle_plates:
                            plate_info = self.best_vehicle_plates[track_id]
                            # Use the one with highest confidence if multiple detected
                            if not detected_license_plate or plate_info[
                                "confidence"
                            ] > detected_license_plate.get("confidence", 0):
                                detected_license_plate = plate_info["text"]
                                # Store license plate for this slot
                                self.slot_license_plates[slot_id] = (
                                    detected_license_plate
                                )

                # If slot is already occupied, check for license plate in stored dict
                if (
                    occupied
                    and not detected_license_plate
                    and slot_id in self.slot_license_plates
                ):
                    detected_license_plate = self.slot_license_plates[slot_id]

                if occupied:
                    state["occupied_count"] += 1
                    state["empty_count"] = 0
                    if (
                        state["status"] != "occupied"
                        and state["occupied_count"] >= OCCUPIED_FRAME_THRESHOLD
                    ):
                        state["status"] = "occupied"
                        # If transitioning to occupied and have a license plate, try to detect arrival
                        if detected_license_plate:
                            try:
                                session_service.detect_license_plate_arrival(
                                    detected_license_plate,
                                    slot_id,
                                    datetime.now(timezone.utc),
                                )
                            except Exception as e:
                                logger.error(
                                    f"Error detecting license plate arrival: {e}"
                                )
                                print(f"Error detecting license plate arrival: {e}")
                    # IMPORTANT: Also check if slot is already occupied but we just detected license plate
                    elif state["status"] == "occupied" and detected_license_plate:
                        # Check if session already exists for this slot
                        try:
                            existing_session = (
                                session_service.get_active_session_by_slot(slot_id)
                            )
                            if not existing_session:
                                # Try to create session now that we have license plate
                                session_service.detect_license_plate_arrival(
                                    detected_license_plate,
                                    slot_id,
                                    datetime.now(timezone.utc),
                                )
                        except Exception as e:
                            logger.error(
                                f"Error creating session for already-occupied slot: {e}"
                            )
                            print(
                                f"Error creating session for already-occupied slot: {e}"
                            )
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
                    # Get license plate for this slot if available (from stored dict or current detection)
                    license_plate = (
                        self.slot_license_plates.get(slot_id) or detected_license_plate
                    )
                    self._handle_status_change(state, current_status, license_plate)
                    state["last_published_status"] = current_status

            # --- Draw polygon fill + border based on status ---
            color = self._status_color(current_status)
            label = self._status_label(state)

            overlay = annotated_frame.copy()
            cv2.fillPoly(overlay, [state["polygon"]], color)
            alpha = 0.3
            cv2.addWeighted(
                overlay, alpha, annotated_frame, 1 - alpha, 0, annotated_frame
            )

            # Border outline
            cv2.polylines(
                annotated_frame,
                [state["polygon"]],
                isClosed=True,
                color=color,
                thickness=2,
            )

            # Label text
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
                (255, 255, 255),
                2,
            )

        # Draw vehicle boxes and license plates
        for vehicle in tracked_vehicles:
            vx1, vy1, vx2, vy2, track_id = map(int, vehicle[:5])
            cv2.rectangle(annotated_frame, (vx1, vy1), (vx2, vy2), (255, 255, 255), 2)
            label = f"ID: {track_id}"
            if track_id in self.best_vehicle_plates:
                best_plate = self.best_vehicle_plates[track_id]
                label += (
                    f" Plate: {best_plate['text']} ({best_plate['confidence']:.2f})"
                )

            # --- Draw background rectangle for text ---
            font_scale = 0.6
            font = cv2.FONT_HERSHEY_SIMPLEX
            thickness = 2

            # Calculate text size
            (text_width, text_height), baseline = cv2.getTextSize(
                label, font, font_scale, thickness
            )
            text_x = vx1
            text_y = max(vy1 - 10, text_height + 10)

            # Draw filled white rectangle as background
            cv2.rectangle(
                annotated_frame,
                (text_x - 2, text_y - text_height - 4),
                (text_x + text_width + 2, text_y + baseline),
                (255, 255, 255),
                cv2.FILLED,
            )

            # Draw black text on top of white background
            cv2.putText(
                annotated_frame,
                label,
                (text_x, text_y - 2),
                font,
                font_scale,
                (0, 0, 0),  # black text
                thickness,
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
