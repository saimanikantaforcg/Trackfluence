import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

export interface RealtimeEvent {
  type: 'ATTRIBUTION_CREATED' | 'PAYOUT_UPDATED' | 'NOTIFICATION' | 'CAMPAIGN_UPDATE';
  payload: Record<string, unknown>;
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // userId → Set of socket IDs
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwt: JwtService) {}

  // ── Connection lifecycle ───────────────────────────────────

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined
      ?? (socket.handshake.headers.authorization ?? '').replace('Bearer ', '');

    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      socket.data.userId = payload.sub;

      // Join a user-specific room
      await socket.join(`user:${payload.sub}`);

      // Track socket
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(socket.id);

      this.logger.log(`Socket connected: userId=${payload.sub} socketId=${socket.id}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      this.userSockets.get(userId)?.delete(socket.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Socket disconnected: socketId=${socket.id}`);
  }

  // ── Client messages ────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: Socket, @MessageBody() _data: unknown) {
    socket.emit('pong', { ts: Date.now() });
  }

  // ── Server-side emit helpers ───────────────────────────────

  /** Emit to all sockets belonging to a specific user */
  emitToUser(userId: string, event: RealtimeEvent): void {
    this.server.to(`user:${userId}`).emit(event.type, event.payload);
  }

  /** Broadcast to all connected clients (e.g. system-wide alert) */
  broadcast(event: RealtimeEvent): void {
    this.server.emit(event.type, event.payload);
  }
}
