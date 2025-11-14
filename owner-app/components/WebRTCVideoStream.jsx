import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  RTCView,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from "react-native-webrtc";

const WebRTCVideoStream = ({
  wsUrl,
  onStreamReady,
  onError,
  containerStyle,
  showStatus = true,
}) => {
  const [status, setStatus] = useState("Connecting...");
  const [statusColor, setStatusColor] = useState("#ff9800");
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const peerConnectionRef = useRef(null);
  const wsRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setupWebRTC();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [wsUrl]);

  const updateStatus = (message, color) => {
    if (!isMountedRef.current) return;
    setStatus(message);
    setStatusColor(color);
  };

  const setupWebRTC = async () => {
    try {
      updateStatus("Initializing...", "#ff9800");

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
            ],
          },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Handle remote stream using the 'ontrack' event
      peerConnection.ontrack = (event) => {
        console.log("✅ Remote track received:", event.track.kind);
        if (event.streams && event.streams[0] && isMountedRef.current) {
          console.log("✅ Setting remote stream:", event.streams[0].id);
          setRemoteStream(event.streams[0]);
          updateStatus("Connected", "#4CAF50");
          setIsConnected(true);
          if (onStreamReady) {
            onStreamReady(event.streams[0]);
          }
        } else {
          console.warn("Received track without a stream.");
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", peerConnection.connectionState);
        if (peerConnection.connectionState === "failed") {
          updateStatus("Connection Failed", "#f44336");
          if (onError) onError("Connection failed");
        } else if (peerConnection.connectionState === "disconnected") {
          updateStatus("Disconnected", "#f44336");
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", peerConnection.iceConnectionState);
      };

      // Create offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true,
      });

      await peerConnection.setLocalDescription(offer);

      // Connect to WebSocket
      connectWebSocket(peerConnection);
    } catch (error) {
      console.error("❌ Error setting up WebRTC:", error);
      updateStatus("Setup Failed", "#f44336");
      if (onError) onError(error.message);
    }
  };

  const connectWebSocket = (peerConnection) => {
    try {
      updateStatus("Connecting to server...", "#ff9800");

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        updateStatus("Sending offer...", "#ff9800");

        // Send offer
        wsRef.current.send(
          JSON.stringify({
            type: "offer",
            sdp: peerConnection.localDescription.sdp,
          })
        );
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "answer") {
            console.log("✅ Received answer");
            const answer = new RTCSessionDescription({
              type: "answer",
              sdp: data.sdp,
            });
            await peerConnection.setRemoteDescription(answer);
            updateStatus("Connected", "#4CAF50");
          } else if (data.error) {
            console.error("❌ Error from server:", data.error);
            updateStatus(`Server Error: ${data.error}`, "#f44336");
            if (onError) onError(data.error);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        updateStatus("WebSocket Error", "#f44336");
        if (onError) onError("WebSocket error");
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
        if (isMountedRef.current) {
          updateStatus("Disconnected", "#f44336");
        }
      };
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
      updateStatus("Connection Error", "#f44336");
      if (onError) onError(error.message);
    }
  };

  const cleanup = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.close();
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.video}
          objectFit="cover"
        />
      ) : (
        <View style={styles.placeholderContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.placeholderText}>Loading video stream...</Text>
        </View>
      )}

      {showStatus && (
        <View
          style={[styles.statusContainer, { backgroundColor: statusColor }]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  placeholderText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  statusContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default WebRTCVideoStream;
