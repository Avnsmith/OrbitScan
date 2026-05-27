import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { env } from '../config/env.config';

@WebSocketGateway({
  cors: {
    origin: '*', // For local dev, allow all origins
  },
})
export class TelemetryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TelemetryGateway.name);

  afterInit(server: Server) {
    this.logger.log('Telemetry WebSocket Gateway initialized.');
  }

  handleConnection(client: Socket, ...args: any[]) {
    // Phase 10: Authenticate WebSocket Handshake
    const token = client.handshake.query.token;
    if (token !== env.API_KEY) {
      this.logger.warn(`Unauthorized connection attempt rejected. Client ID: ${client.id}`);
      client.emit('error', { message: 'Unauthorized WebSocket handshake' });
      client.disconnect(true);
      return;
    }

    this.logger.log(`Client connected and authenticated: ${client.id}`);
    client.emit('system.status', { connected: true, timestamp: new Date() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Broadcasters
  broadcastEntropyGenerated(data: any) {
    this.server.emit('entropy.generated', data);
  }

  broadcastArtifactCreated(data: any) {
    this.server.emit('artifact.created', data);
  }

  broadcastRelayUpdated(data: any) {
    this.server.emit('relay.updated', data);
  }

  broadcastVerificationCompleted(data: any) {
    this.server.emit('verification.completed', data);
  }

  broadcastTelemetryLog(data: any) {
    this.server.emit('telemetry.log', data);
  }
}
