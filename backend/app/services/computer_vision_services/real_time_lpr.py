# python app/services/real_time_lpr.py

import string
import cv2
import numpy as np
from ultralytics import YOLO
from sort import Sort
import easyocr

# --- Model and Reader Initialization ---
coco_model = YOLO('yolo11n.pt')
license_plate_detector = YOLO('license-plate-finetune-v1n.pt')
reader = easyocr.Reader(['en'], gpu=True)

# --- Tracker Initialization ---
mot_tracker = Sort()

# --- Video Capture ---
cap = cv2.VideoCapture('sample_video4.mp4')
vehicles = [2, 3, 5, 7]

# --- Data Structure for Real-time Tracking ---
tracked_plates = {}

# --- Character Correction Mapping ---
# This mapping will be used to correct common OCR errors.
CHAR_MAPPING = {'O': '0', 'I': '1', 'J': '3', 'A': '4', 'G': '6', 'S': '5', 'B': '8', 'Z': '2'}

# --- Helper Functions ---

def format_license(text):
    """
    Formats the license plate text by:
    1. Keeping only alphanumeric characters.
    2. Applying character corrections from CHAR_MAPPING.
    """
    formatted_text = ""
    for char in text:
        if char.isalnum():
            formatted_text += CHAR_MAPPING.get(char, char)
    return formatted_text

def read_license_plate(license_plate_crop, car_id_for_debug):
    """
    Reads license plate text, favoring the result with the highest confidence
    and applying formatting.
    """
    print(f"\n[DEBUG] Car ID {car_id_for_debug}: Running EasyOCR on a new crop.")
    detections = reader.readtext(license_plate_crop)

    if not detections:
        print(f"[DEBUG] Car ID {car_id_for_debug}: EasyOCR returned NO results.")
        return None, None

    print(f"[DEBUG] Car ID {car_id_for_debug}: EasyOCR Raw Output -> {detections}")

    best_text = None
    best_score = 0.0

    for _, text, score in detections:
        cleaned_text = text.upper().replace(' ', '')
        formatted_text = format_license(cleaned_text)
        if len(formatted_text) < 4:
            print(f"[DEBUG] Car ID {car_id_for_debug}: FAILED. Formatted text '{formatted_text}' is too short.")
            continue
        if score > best_score:
            best_score = score
            best_text = formatted_text
            print(f"[DEBUG] Car ID {car_id_for_debug}: SUCCESS! Found candidate '{best_text}' with score {best_score:.2f}")

    if best_text:
        return best_text, best_score
    else:
        print(f"[DEBUG] Car ID {car_id_for_debug}: No suitable text found after processing.")
        return None, None


def get_car(license_plate, vehicle_track_ids):
    """Assigns a license plate to a vehicle if the plate is inside the vehicle's bbox."""
    px1, py1, px2, py2, _, _ = license_plate
    for xcar1, ycar1, xcar2, ycar2, car_id in vehicle_track_ids:
        if px1 > xcar1 and py1 > ycar1 and px2 < xcar2 and py2 < ycar2:
            return int(car_id)
    return -1

# --- Main Processing Loop ---
while True:
    ret, frame = cap.read()
    if not ret:
        print("Video stream ended or failed to read frame.")
        break
    
    # --- Vehicle Detection ---
    detections = coco_model(frame, conf=0.2)[0]
    detections_ = []
    for detection in detections.boxes.data.tolist():
        x1, y1, x2, y2, score, class_id = detection
        if int(class_id) in vehicles:
            detections_.append([x1, y1, x2, y2, score])

    # --- Vehicle Tracking ---
    track_ids = mot_tracker.update(np.asarray(detections_))

    # --- License Plate Detection ---
    license_plates = license_plate_detector(frame)[0]
    for license_plate in license_plates.boxes.data.tolist():
        car_id = get_car(license_plate, track_ids)

        if car_id != -1:
            px1, py1, px2, py2, _, _ = license_plate
            plate_crop = frame[int(py1):int(py2), int(px1):int(px2), :]

            if plate_crop.size == 0:
                continue 
            
            # Show the crop that will be processed
            cv2.imshow(f'Crop for Car ID {car_id}', plate_crop)

            plate_text, plate_score = read_license_plate(plate_crop, car_id)
            if plate_text is not None:
                if car_id not in tracked_plates or plate_score > tracked_plates[car_id]['score']:
                    tracked_plates[car_id] = {'text': plate_text, 'score': plate_score}

    # --- Visualization ---
    annotated_frame = frame.copy()
    for track in track_ids:
        x1, y1, x2, y2, track_id = map(int, track)

        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 255, 255), 3)

        if track_id in tracked_plates:
            plate_info = tracked_plates[track_id]
            label = f"ID {track_id}: {plate_info['text']} ({plate_info['score']:.2f})"
            (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
            cv2.rectangle(annotated_frame, (x1, y1 - text_height - 10), (x1 + text_width, y1 - 10), (255, 255, 255), -1)
            cv2.putText(annotated_frame, label, (x1, y1 - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
        else:
            label = f"ID {track_id}"
            cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

    cv2.imshow('Real-time LPR', annotated_frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# --- Cleanup ---
cap.release()
cv2.destroyAllWindows()