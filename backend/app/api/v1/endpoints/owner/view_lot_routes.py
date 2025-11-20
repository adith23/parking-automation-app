import cv2
import os
import json
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer
import logging

from app.core.database import get_db
from app.core.config import settings
from app.utils.s3 import download_file_from_s3
from app import models
from app.models.owner_models.parking_lot_model import ParkingLot
from app.services.computer_vision_services.computer_vision_service import (
    ComputerVisionService,
)
from app.services.webrtc_service import webrtc_manager, WebRTCVideoTrack


router = APIRouter()
logger = logging.getLogger(__name__)

script_dir = os.path.dirname(__file__)
TEMPLATES_PATH = os.path.join(script_dir, "..", "..", "templates")
LOCAL_VIDEO_PATH = "/tmp/live_view_video.mp4"


async def _initialize_cv_service(parking_lot_id: int, db: Session):
    """Initialize CV and ensure S3 video is available."""

    lot = (
        db.query(models.owner_models.ParkingLot)
        .filter(models.owner_models.ParkingLot.id == parking_lot_id)
        .first()
    )

    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")

    # Always download video from S3
    from app.utils.s3 import download_file_from_s3

    s3_bucket = settings.S3_BUCKET_NAME
    s3_key = settings.VIDEO_S3_PATH

    video_path = download_file_from_s3(
        bucket_name=s3_bucket, file_key=s3_key, local_path=LOCAL_VIDEO_PATH
    )

    logger.info(f"✅ Video downloaded to: {video_path}")

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video source not found")

    # Load slot polygons from DB
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
    return cv_service, video_path


@router.websocket("/ws/{parking_lot_id}/live-view")
async def websocket_live_view(
    websocket: WebSocket, parking_lot_id: int, db: Session = Depends(get_db)
):
    """
    WebRTC endpoint for live parking lot viewing.
    Accepts WebRTC offer, returns answer with video track.
    """
    await websocket.accept()

    session_id = f"live-view-{parking_lot_id}"

    # CRITICAL: Add ICE servers configuration for AWS
    ice_servers = [
        RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
        RTCIceServer(urls=["stun:stun1.l.google.com:19302"]),
    ]

    pc = RTCPeerConnection(configuration=RTCConfiguration(iceServers=ice_servers))
    video_source = None

    # Add ICE debugging
    @pc.on("iceconnectionstatechange")
    async def on_ice_connection_state_change():
        logger.info(f"🧊 ICE Connection State [{session_id}]: {pc.iceConnectionState}")

    @pc.on("connectionstatechange")
    async def on_connection_state_change():
        logger.info(f"🔌 Connection State [{session_id}]: {pc.connectionState}")

    try:
        # Initialize computer vision service
        cv_service, video_path = await _initialize_cv_service(parking_lot_id, db)

        # Create a dedicated video source for this client session
        from app.services.webrtc_service import VideoTrackSource

        video_source = VideoTrackSource(
            video_path=video_path,
            frame_processor=cv_service.process_frame,
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
        logger.info(f"✅ WebRTC session created: {session_id}")

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

        logger.info(f"✅ WebRTC answer sent for session: {session_id}")

        # Keep connection alive
        while True:
            try:
                await websocket.receive_text()
            except Exception as e:
                logger.info(f"WebSocket connection closed for {session_id}: {e}")
                break

    except Exception as e:
        logger.error(f"❌ Error in live view WebRTC: {e}", exc_info=True)
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except:
            pass

    finally:
        # CRITICAL: Clean up in correct order
        logger.info(f"Starting cleanup for {session_id}")

        # 1. Close peer connection first
        try:
            await pc.close()
            logger.info(f"Peer connection closed for {session_id}")
        except Exception as e:
            logger.error(f"Error closing peer connection: {e}")

        # 2. Stop video source
        if video_source:
            try:
                await video_source.stop()
                logger.info(f"Video source stopped for {session_id}")
            except Exception as e:
                logger.error(f"Error stopping video source: {e}")

        # 3. Remove session
        webrtc_manager.remove_session(session_id)
        logger.info(f"✅ WebRTC session fully cleaned up: {session_id}")


@router.get("/{parking_lot_id}/live-view-ui", response_class=HTMLResponse)
async def get_live_view_page(parking_lot_id: int, db: Session = Depends(get_db)):
    """Serve the HTML page for live parking lot viewing"""
    try:
        parking_lot = (
            db.query(ParkingLot).filter(ParkingLot.id == parking_lot_id).first()
        )

        if not parking_lot:
            raise HTTPException(status_code=404, detail="Parking lot not found")

        template_path = os.path.join(TEMPLATES_PATH, "live_view.html")
        with open(template_path, "r", encoding="utf-8") as f:
            html_content = f.read().replace("{{ parking_lot_id }}", str(parking_lot_id))

        return html_content
    except Exception as e:
        logger.error(f"Error serving live view page: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to load live view page")
