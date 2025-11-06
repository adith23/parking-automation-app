import cv2
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.orm import Session
from shapely.geometry import Polygon
from geoalchemy2.elements import WKTElement

from app import schemas, models
from app.core.database import get_db
from app.schemas.owner_schemas.parking_slot_schema import ParkingSlotBulkCreate
from app.models.owner_models.parking_slot_model import ParkingSlot

router = APIRouter()

# --- Path Configuration ---
# In a real app, you would fetch the video path from the database based on the parking_lot_id
script_dir = os.path.dirname(__file__)
VIDEO_PATH = r"C:\Users\Adithya\Downloads\sample_video5..mp4"
TEMPLATES_PATH = os.path.join(script_dir, "..", "..", "templates")

# --- Video Streaming Logic ---
def generate_frames(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ConnectionError("Could not open video stream.")

    while True:
        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Loop video
            continue

        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            continue

        frame_bytes = buffer.tobytes()
        yield (
            b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
    cap.release()

@router.get("/{parking_lot_id}/stream", summary="Stream video for a parking lot")
async def video_stream(parking_lot_id: int):
    if not os.path.exists(VIDEO_PATH):
        raise HTTPException(status_code=404, detail="Video source not found.")

    return StreamingResponse(
        generate_frames(VIDEO_PATH),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

# --- Save Slots Logic ---
@router.post(
    "/{parking_lot_id}/slots", summary="Save or update parking slots for a lot"
)
async def save_parking_slots(
    parking_lot_id: int,
    slots_data: ParkingSlotBulkCreate,
    db: Session = Depends(get_db),
):
    try:
        db.query(ParkingSlot).filter(
            ParkingSlot.parking_lot_id == parking_lot_id
        ).delete()

        new_slots = []
        for i, slot in enumerate(slots_data.slots):
            polygon = Polygon(slot["coordinates"])
            wkt_polygon = polygon.wkt

            db_slot = ParkingSlot(
                slot_number=f"Slot {i + 1}",
                parking_lot_id=parking_lot_id,
                location=WKTElement(wkt_polygon, srid=4326),
                status="available",
            )
            new_slots.append(db_slot)

        db.add_all(new_slots)
        db.commit()
        return {
            "message": f"Successfully saved {len(new_slots)} slots for lot {parking_lot_id}."
        }

    except Exception as e:
        db.rollback()
        print(f"❌ Error while saving slots: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving slots: {str(e)}")

# --- Endpoint to Serve the HTML page ---
@router.get("/{parking_lot_id}/define-slots-ui", response_class=HTMLResponse)
async def get_define_slots_page(parking_lot_id: int):
    html_path = os.path.join(TEMPLATES_PATH, "define_slots.html")
    if not os.path.exists(html_path):
        raise HTTPException(status_code=404, detail="HTML template not found.")

    with open(html_path, "r") as f:
        html_content = f.read()

    # Inject the dynamic URL into the HTML
    html_content = html_content.replace("{{ parking_lot_id }}", str(parking_lot_id))
    return HTMLResponse(content=html_content)
