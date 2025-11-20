import os
import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from shapely.geometry import Polygon
from geoalchemy2.elements import WKTElement
from aiortc import RTCPeerConnection, RTCSessionDescription
import logging

from app import schemas, models
from app.core.database import get_db
from app.core.config import settings
from app.models.owner_models.parking_lot_model import ParkingLot
from app.schemas.owner_schemas.parking_slot_schema import ParkingSlotBulkCreate
from app.models.owner_models.parking_slot_model import ParkingSlot
from app.services.webrtc_service import webrtc_manager, WebRTCVideoTrack
from app.utils.s3 import download_file_from_s3

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Path Configuration ---
script_dir = os.path.dirname(__file__)
LOCAL_VIDEO_PATH = "/tmp/sample_video.mp4"
TEMPLATES_PATH = os.path.join(script_dir, "..", "..", "templates")


def _get_raw_frame_processor():
    """
    Returns a simple frame processor that returns raw frames without CV processing.
    Used for slot definition where we don't need occupancy detection.
    """

    def process_raw_frame(frame):
        return frame

    return process_raw_frame


@router.websocket("/ws/{parking_lot_id}/define-slots")
async def websocket_define_slots(websocket: WebSocket, parking_lot_id: int):
    """
    WebRTC endpoint for defining parking slots.
    Accepts WebRTC offer, returns answer with raw video track (no CV processing).
    """
    await websocket.accept()

    session_id = f"define-slots-{parking_lot_id}"
    pc = RTCPeerConnection()
    video_source = None

    try:

        # --- Download video from S3 using the utility function ---
        video_path = download_file_from_s3(
            bucket_name=settings.S3_BUCKET_NAME,
            file_key=settings.VIDEO_S3_PATH,
            local_path=LOCAL_VIDEO_PATH,
        )
        # Create a dedicated video source for this client session
        from app.services.webrtc_service import VideoTrackSource

        video_source = VideoTrackSource(
            video_path=video_path,
            frame_processor=_get_raw_frame_processor(),
            fps=30,
        )

        # Start the video source (create queue in async context)
        await video_source.start()

        # Create and add video track
        video_track = WebRTCVideoTrack(
            track_id=f"video-{session_id}",
            video_source=video_source,
        )
        pc.addTrack(video_track)

        # Create session record
        webrtc_manager.create_session(session_id, parking_lot_id)
        logger.info(f"✅ WebRTC session created for slot definition: {session_id}")

        # Handle incoming WebRTC offer
        data = await websocket.receive_text()
        offer_data = json.loads(data)

        offer = RTCSessionDescription(sdp=offer_data["sdp"], type=offer_data["type"])

        # Set remote description and create answer
        await pc.setRemoteDescription(offer)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        # Send answer back to client
        await websocket.send_text(
            json.dumps({"type": "answer", "sdp": pc.localDescription.sdp})
        )

        logger.info(f"✅ WebRTC answer sent for slot definition session: {session_id}")

        # Keep connection alive
        while True:
            try:
                await websocket.receive_text()
            except Exception as e:
                logger.info(f"WebSocket connection closed for {session_id}: {e}")
                break

    except Exception as e:
        logger.error(f"❌ Error in define slots WebRTC: {e}")
        await websocket.send_text(json.dumps({"error": str(e)}))

    finally:
        # Clean up
        if video_source:
            await video_source.stop()
        webrtc_manager.remove_session(session_id)
        await pc.close()
        logger.info(f"✅ WebRTC session closed: {session_id}")


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
async def get_define_slots_page(parking_lot_id: int, db: Session = Depends(get_db)):
    """Serve the HTML page for defining parking slots"""
    try:
        parking_lot = (
            db.query(ParkingLot).filter(ParkingLot.id == parking_lot_id).first()
        )

        if not parking_lot:
            raise HTTPException(status_code=404, detail="Parking lot not found")

        template_path = os.path.join(TEMPLATES_PATH, "define_slots.html")
        with open(template_path, "r", encoding="utf-8") as f:
            html_content = f.read().replace("{{ parking_lot_id }}", str(parking_lot_id))

        return html_content
    except Exception as e:
        logger.error(f"Error serving define slots page: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to load define slots page")
