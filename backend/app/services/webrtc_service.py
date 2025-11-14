"""
WebRTC Video Streaming Service

Manages video track creation and frame processing for WebRTC connections.
Uses av library to handle video encoding and aiortc for WebRTC protocol.
"""

import asyncio
import cv2
import numpy as np
from typing import Callable, Optional, List, Dict, Any
from av import VideoFrame
from aiortc import MediaStreamTrack
import logging
import time
from fractions import Fraction

logger = logging.getLogger(__name__)


class VideoTrackSource:
    """
    Manages a video source that can be consumed by WebRTC connections.
    Processes frames using a provided callback function (computer vision service).
    """

    def __init__(
        self,
        video_path: str,
        frame_processor: Callable[[np.ndarray], np.ndarray],
        fps: int = 30,
    ):
        """
        Initialize the video track source.

        Args:
            video_path: Path to the video file or camera index
            frame_processor: Function that processes raw frames (e.g., ComputerVisionService.process_frame)
            fps: Frames per second for the video stream
        """
        self.video_path = video_path
        self.frame_processor = frame_processor
        self.fps = fps
        self.cap = None
        self.is_running = False
        self.frame_queue: Optional[asyncio.Queue] = None
        self.processing_task = None

    async def start(self):
        """Start the video capture and processing loop."""
        if self.is_running:
            return

        self.is_running = True
        
        # Create queue here in async context
        self.frame_queue = asyncio.Queue(maxsize=2)
        
        self.cap = cv2.VideoCapture(self.video_path)

        if not self.cap.isOpened():
            self.is_running = False
            raise RuntimeError(f"Could not open video source: {self.video_path}")

        logger.info(f"✅ Video source opened: {self.video_path}")

        # Start the frame processing loop
        self.processing_task = asyncio.create_task(self._process_frames())

    async def stop(self):
        """Stop video capture and processing."""
        self.is_running = False
        if self.processing_task:
            try:
                await asyncio.wait_for(self.processing_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Frame processing task did not complete in time")
        if self.cap:
            self.cap.release()
        logger.info("✅ Video source stopped")

    async def _process_frames(self):
        """Continuously read, process, and queue frames."""
        frame_delay = 1.0 / self.fps
        frame_count = 0

        while self.is_running:
            try:
                success, frame = self.cap.read()

                if not success:
                    # Loop the video
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                # Process the frame using the provided processor
                processed_frame = self.frame_processor(frame)

                # Add the frame to the queue (drop old frames if queue is full)
                if self.frame_queue is not None:
                    try:
                        self.frame_queue.put_nowait(processed_frame)
                        frame_count += 1
                        if frame_count % 60 == 0:
                            logger.debug(f"Queued {frame_count} frames from {self.video_path}")
                    except asyncio.QueueFull:
                        # Drop oldest frame to make room
                        try:
                            self.frame_queue.get_nowait()
                        except asyncio.QueueEmpty:
                            pass
                        try:
                            self.frame_queue.put_nowait(processed_frame)
                        except asyncio.QueueFull:
                            logger.warning("Frame dropped - queue still full")

                # Maintain target FPS
                await asyncio.sleep(frame_delay)

            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await asyncio.sleep(frame_delay)

    async def get_frame(self) -> Optional[np.ndarray]:
        """Get the next processed frame from the queue."""
        if self.frame_queue is None:
            logger.warning("Frame queue not initialized")
            return None
        try:
            return await asyncio.wait_for(self.frame_queue.get(), timeout=2.0)
        except asyncio.TimeoutError:
            logger.warning(f"Frame queue timeout for {self.video_path}")
            return None


class WebRTCVideoTrack(MediaStreamTrack):
    """
    A media track for WebRTC that emits video frames.
    Inherits from aiortc.MediaStreamTrack to be a valid WebRTC track.
    """

    kind = "video"

    def __init__(self, track_id: str, video_source: VideoTrackSource):
        """
        Initialize the WebRTC video track.

        Args:
            track_id: Unique identifier for this track
            video_source: VideoTrackSource instance to pull frames from
        """
        super().__init__()
        self.track_id = track_id
        self.video_source = video_source
        self._start_time = time.time()
        self._frame_count = 0

    async def recv(self) -> Optional[VideoFrame]:
        """
        Receive the next frame (required by aiortc MediaStreamTrack interface).

        Returns:
            VideoFrame or None if no frame is available
        """
        try:
            frame_np = await self.video_source.get_frame()

            if frame_np is None:
                logger.warning(f"No frame available for track {self.track_id}")
                # Return a black frame to keep connection alive
                frame_np = np.zeros((480, 640, 3), dtype=np.uint8)

            # Ensure frame is in BGR format (OpenCV standard)
            if len(frame_np.shape) == 2:
                # Grayscale to BGR
                frame_np = cv2.cvtColor(frame_np, cv2.COLOR_GRAY2BGR)

            # Convert BGR (OpenCV) to RGB for video output
            frame_rgb = cv2.cvtColor(frame_np, cv2.COLOR_BGR2RGB)

            # Create an av.VideoFrame from numpy array
            frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")

            # Set proper timestamp (required for sync)
            pts_time = time.time() - self._start_time
            frame.pts = int(pts_time * 90000)
            frame.time_base = Fraction(1, 90000)

            self._frame_count += 1
            if self._frame_count % 30 == 0:
                logger.debug(f"Track {self.track_id} sent {self._frame_count} frames")

            return frame

        except Exception as e:
            logger.error(f"Error in recv for track {self.track_id}: {e}")
            # Return a black frame to keep connection alive
            frame_rgb = np.zeros((480, 640, 3), dtype=np.uint8)
            frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")
            # Also set timestamp on the fallback frame
            pts_time = time.time() - self._start_time
            frame.pts = int(pts_time * 90000)
            frame.time_base = Fraction(1, 90000)
            return frame


class WebRTCSessionManager:
    """
    Manages WebRTC peer connections and associated video tracks.
    """

    def __init__(self):
        """Initialize the WebRTC session manager."""
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.video_sources: Dict[int, VideoTrackSource] = {}

    def register_video_source(
        self,
        parking_lot_id: int,
        video_path: str,
        frame_processor: Callable[[np.ndarray], np.ndarray],
        fps: int = 30,
    ) -> VideoTrackSource:
        """
        Register a video source for a parking lot.

        Args:
            parking_lot_id: The parking lot ID
            video_path: Path to the video file
            frame_processor: Function to process frames
            fps: Frames per second

        Returns:
            VideoTrackSource instance
        """
        if parking_lot_id not in self.video_sources:
            source = VideoTrackSource(video_path, frame_processor, fps)
            self.video_sources[parking_lot_id] = source
            logger.info(f"✅ Registered video source for parking lot {parking_lot_id}")

        return self.video_sources[parking_lot_id]

    def get_video_source(self, parking_lot_id: int) -> Optional[VideoTrackSource]:
        """Get a registered video source by parking lot ID."""
        return self.video_sources.get(parking_lot_id)

    def create_session(self, session_id: str, parking_lot_id: int) -> Dict[str, Any]:
        """Create a new WebRTC session."""
        self.sessions[session_id] = {
            "parking_lot_id": parking_lot_id,
            "created_at": time.time(),
        }
        return self.sessions[session_id]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    def remove_session(self, session_id: str):
        """Remove a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"✅ Session removed: {session_id}")

    async def cleanup(self):
        """Clean up all video sources."""
        for source in self.video_sources.values():
            await source.stop()
        self.video_sources.clear()
        self.sessions.clear()
        logger.info("✅ WebRTC manager cleaned up")


# Global instance
webrtc_manager = WebRTCSessionManager()
