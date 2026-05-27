import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTelemetryStore } from '../store/telemetryStore';

const SOCKET_URL = 'http://localhost:3001';

export function useTelemetryWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnected,
    processRelayUpdate,
    processEntropyGenerated,
    processArtifactCreated,
    processVerificationCompleted,
    processTelemetryLog,
    loadInitialData,
  } = useTelemetryStore();

  useEffect(() => {
    // 1. Fetch initial snapshot from REST APIs first
    loadInitialData();

    // 2. Initialize Socket.io connection with secure Handshake token (Phase 10)
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
      query: {
        token: 'ORBIT_DEV_KEY_2026',
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🛰️ Telemetry connection successfully established.');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('📡 Telemetry connection lost. Retrying...');
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    // 3. Register real-time message list listeners
    socket.on('relay.updated', (data) => {
      processRelayUpdate(data);
    });

    socket.on('entropy.generated', (data) => {
      processEntropyGenerated(data);
    });

    socket.on('artifact.created', (data) => {
      processArtifactCreated(data);
    });

    socket.on('verification.completed', (data) => {
      processVerificationCompleted(data);
    });

    socket.on('telemetry.log', (data) => {
      processTelemetryLog(data);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [
    setConnected,
    processRelayUpdate,
    processEntropyGenerated,
    processArtifactCreated,
    processVerificationCompleted,
    processTelemetryLog,
    loadInitialData,
  ]);

  return socketRef.current;
}
