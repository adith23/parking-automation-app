import cv2
import os
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape  
from app.core.database import get_db
from app import models
from app.services.computer_vision_services.computer_vision_service import ComputerVisionService

router = APIRouter()

script_dir = os.path.dirname(__file__)
TEMPLATES_PATH = os.path.join(script_dir, "..", "..", "templates")

def generate_processed_frames(parking_lot_id: int, db: Session):
    lot = (
        db.query(models.owner_models.ParkingLot)
        .filter(models.owner_models.ParkingLot.id == parking_lot_id)
        .first()
    )
    # Use placeholder video if not specified in DB
    video_path = r"C:\Users\Adithya\Downloads\sample_video5..mp4"

    if not os.path.exists(video_path):
        raise ConnectionError("Video source not found.")

    # Fetch slot polygons from the database and convert them for OpenCV
    db_slots = (
        db.query(models.owner_models.ParkingSlot)
        .filter(models.owner_models.ParkingSlot.parking_lot_id == parking_lot_id)
        .all()
    )
    slot_definitions = []

    for slot in db_slots:
        poly = to_shape(slot.location)
        coords = np.array(poly.exterior.coords, dtype=np.int32).reshape((-1, 1, 2))
        slot_definitions.append(
            {
                "slot_id": slot.id,
                "parking_lot_id": slot.parking_lot_id,
                "polygon": coords,
                "status": slot.status,
                "label": slot.slot_number or f"Slot {slot.id}",
            }
        )

    cv_service = ComputerVisionService(slot_definitions)

    cap = cv2.VideoCapture(video_path)
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        # Process the frame to get all drawings
        processed_frame = cv_service.process_frame(frame)

        ret, buffer = cv2.imencode(".jpg", processed_frame)
        if not ret:
            continue

        frame_bytes = buffer.tobytes()
        yield (
            b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
    cap.release()


@router.get("/{parking_lot_id}/live-view-stream", summary="Stream processed video feed")
async def live_view_stream(parking_lot_id: int, db: Session = Depends(get_db)):
    return StreamingResponse(
        generate_processed_frames(parking_lot_id, db),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

@router.get("/{parking_lot_id}/live-view-ui", response_class=HTMLResponse)
async def get_live_view_page(parking_lot_id: int):
    html_path = os.path.join(TEMPLATES_PATH, "live_view.html")
    if not os.path.exists(html_path):
        raise HTTPException(status_code=404, detail="HTML template not found.")

    with open(html_path, "r") as f:
        html_content = f.read().replace("{{ parking_lot_id }}", str(parking_lot_id))

    return HTMLResponse(content=html_content)
