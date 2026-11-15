/**
 * MOONBOUND Multiplayer Client Wrapper
 * Connects to the Node.js Socket.IO server for collaborative multiplayer expeditions.
 */

import { io, Socket } from 'socket.io-client';
import { RemotePlayerState } from './canvasEngine';
import { PlacedBuilding } from './simulation';

export interface MultiplayerCallbacks {
  onConnected: (id: string) => void;
  onDisconnected: () => void;
  onRoomState: (state: {
    roomId: string;
    players: RemotePlayerState[];
    buildings: PlacedBuilding[];
    sharedInventory: Record<string, number>;
    sharedSpaceDollars: number;
  }) => void;
  onPlayerJoined: (player: { id: string; name: string; avatarId: string }) => void;
  onPlayerMoved: (player: RemotePlayerState) => void;
  onPlayerLeft: (id: string) => void;
  onPlayerEmote: (id: string, emote: string) => void;
  onBuildingPlaced: (building: PlacedBuilding & { placedBy?: string }) => void;
  /** Server refused an action (e.g. invalid build spot) or the room was full. */
  onRejected?: (reason: string) => void;
}

export class MultiplayerClient {
  private socket: Socket | null = null;
  private callbacks: MultiplayerCallbacks;
  public isConnected: boolean = false;
  public currentRoomId: string | null = null;

  /** This client's socket id, used to ignore our own echoed buildings. */
  public get id(): string | undefined {
    return this.socket?.id;
  }

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(roomId: string, playerName: string, avatarId: string) {
    if (this.socket) {
      this.disconnect();
    }

    try {
      this.socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      });

      this.currentRoomId = roomId;

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.callbacks.onConnected(this.socket!.id || 'unknown');
        this.socket!.emit('join_room', { roomId, name: playerName, avatarId });
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.callbacks.onDisconnected();
      });

      this.socket.on('room_state', (data) => {
        this.callbacks.onRoomState(data);
      });

      this.socket.on('player_joined', (data) => {
        this.callbacks.onPlayerJoined(data);
      });

      this.socket.on('player_moved', (data) => {
        this.callbacks.onPlayerMoved(data);
      });

      this.socket.on('player_left', (data) => {
        this.callbacks.onPlayerLeft(data.id);
      });

      this.socket.on('player_emoted', (data) => {
        this.callbacks.onPlayerEmote(data.id, data.emote);
      });

      this.socket.on('building_placed', (data) => {
        this.callbacks.onBuildingPlaced(data);
      });

      this.socket.on('action_rejected', (data) => {
        this.callbacks.onRejected?.(data?.reason || 'Action rejected by server.');
      });

      this.socket.on('join_rejected', (data) => {
        this.callbacks.onRejected?.(data?.reason || 'Could not join room.');
        this.disconnect();
      });
    } catch (err) {
      console.warn('Multiplayer connection failed, fallback to local single player:', err);
    }
  }

  public sendMovement(x: number, y: number, direction: string, isMoving: boolean, isInRover: boolean) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player_move', { x, y, direction, isMoving, isInRover });
    }
  }

  public sendEmote(emote: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('player_emote', { emote });
    }
  }

  public sendBuildingPlaced(recipeId: string, x: number, y: number) {
    if (this.socket && this.isConnected) {
      this.socket.emit('place_building', { recipeId, x, y });
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentRoomId = null;
  }
}
