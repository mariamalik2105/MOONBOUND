/**
 * MOONBOUND Multiplayer Server & Backend
 * Node.js + Express + Socket.IO
 * Provides room lobbies (max 4 crew), real-time player position syncing, shared building
 * state, and server-side checks on building placement (known recipe, inside the map,
 * snapped to the grid, no overlaps, rate-limited). Materials and SpaceDollars are still
 * charged on each player's own client; a shared server-side economy is future work.
 *
 * Also proxies NASA DONKI flare data (/api/space-weather) so the browser never needs an API key.
 */

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUILDING_RECIPES } from './src/game/economy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// In-memory Room State for multiplayer sessions
interface RoomState {
  roomId: string;
  hostId: string;
  players: Map<string, {
    id: string;
    name: string;
    avatarId: string;
    x: number;
    y: number;
    direction: string;
    isMoving: boolean;
    isInRover: boolean;
    emote?: string;
  }>;
  buildings: Array<{
    instanceId: string;
    recipeId: string;
    x: number;
    y: number;
    status: string;
    health: number;
    dustAccumulation: number;
    placedBy?: string;
  }>;
  sharedInventory: Record<string, number>;
  sharedSpaceDollars: number;
}

const rooms = new Map<string, RoomState>();

const MAX_PLAYERS_PER_ROOM = 4;
const GRID = 24;
const WORLD_BOUNDS = { minX: -1200, maxX: 2400, minY: -1200, maxY: 2000 };
const BUILD_COOLDOWN_MS = 400;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Server-side placement check. Returns an error message, or null when the placement is valid. */
export function validatePlacement(
  room: RoomState,
  data: { recipeId?: unknown; x?: unknown; y?: unknown }
): string | null {
  if (typeof data.recipeId !== 'string' || !BUILDING_RECIPES[data.recipeId]) return 'Unknown building.';
  if (!isFiniteNumber(data.x) || !isFiniteNumber(data.y)) return 'Bad position.';
  if (data.x % GRID !== 0 || data.y % GRID !== 0) return 'Position must be on the build grid.';
  if (data.x < WORLD_BOUNDS.minX || data.x > WORLD_BOUNDS.maxX || data.y < WORLD_BOUNDS.minY || data.y > WORLD_BOUNDS.maxY) {
    return 'Outside the mission map.';
  }
  const r = BUILDING_RECIPES[data.recipeId];
  const w = r.width * GRID;
  const h = r.height * GRID;
  for (const b of room.buildings) {
    const br = BUILDING_RECIPES[b.recipeId];
    const bw = (br?.width || 2) * GRID;
    const bh = (br?.height || 2) * GRID;
    if (data.x < b.x + bw && data.x + w > b.x && data.y < b.y + bh && data.y + h > b.y) {
      return 'Another building is already there.';
    }
  }
  return null;
}

// --- NASA DONKI proxy (cached so many players share one request) ---
let donkiCache: { key: string; at: number; body: unknown } | null = null;
const DONKI_TTL_MS = 30 * 60 * 1000;

function getOrCreateRoom(roomId: string, hostId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      hostId,
      players: new Map(),
      buildings: [],
      sharedInventory: {
        regolith: 12,
        metalOre: 8,
        silicon: 6,
        waterIce: 0,
        seeds: 2,
      },
      sharedSpaceDollars: 200,
    };
    rooms.set(roomId, room);
  }
  return room;
}

// REST Healthcheck & status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'MOONBOUND',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/space-weather', async (req, res) => {
  const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const end = isDate(req.query.endDate) ? String(req.query.endDate) : new Date().toISOString().slice(0, 10);
  const start = isDate(req.query.startDate)
    ? String(req.query.startDate)
    : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const key = `${start}:${end}`;
  if (donkiCache && donkiCache.key === key && Date.now() - donkiCache.at < DONKI_TTL_MS) {
    return res.json({ source: 'NASA DONKI (cached)', flares: donkiCache.body });
  }
  try {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const url = `https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${apiKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`DONKI HTTP ${r.status}`);
    const body = await r.json();
    donkiCache = { key, at: Date.now(), body };
    res.json({ source: 'NASA DONKI', flares: body });
  } catch (err) {
    res.status(502).json({ source: 'unavailable', error: (err as Error).message });
  }
});

// Socket.IO event handlers
io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let playerName: string = 'Astronaut';
  let playerAvatar: string = 'engineer';

  socket.on('join_room', (data: { roomId: string; name: string; avatarId: string }) => {
    const roomId = String(data?.roomId || 'alpha-base').trim().toLowerCase().slice(0, 32) || 'alpha-base';
    const existing = rooms.get(roomId);
    if (existing && existing.players.size >= MAX_PLAYERS_PER_ROOM && !existing.players.has(socket.id)) {
      socket.emit('join_rejected', { reason: `Room is full (max ${MAX_PLAYERS_PER_ROOM} crew).` });
      return;
    }
    currentRoomId = roomId;
    playerName = String(data?.name || `Crew-${socket.id.substring(0, 4)}`).slice(0, 24);
    playerAvatar = String(data?.avatarId || 'engineer').slice(0, 24);

    socket.join(roomId);
    const room = getOrCreateRoom(roomId, socket.id);

    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      avatarId: playerAvatar,
      x: 350 + (Math.random() - 0.5) * 60,
      y: 350 + (Math.random() - 0.5) * 60,
      direction: 'down',
      isMoving: false,
      isInRover: false,
    });

    // Send initial room state to joining player
    socket.emit('room_state', {
      roomId,
      players: Array.from(room.players.values()),
      buildings: room.buildings,
      sharedInventory: room.sharedInventory,
      sharedSpaceDollars: room.sharedSpaceDollars,
    });

    // Broadcast player joined
    socket.to(roomId).emit('player_joined', {
      id: socket.id,
      name: playerName,
      avatarId: playerAvatar,
    });
  });

  socket.on('player_move', (data: { x: number; y: number; direction: string; isMoving: boolean; isInRover: boolean }) => {
    if (!currentRoomId) return;
    if (!isFiniteNumber(data?.x) || !isFiniteNumber(data?.y)) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const p = room.players.get(socket.id);
    if (p) {
      p.x = data.x;
      p.y = data.y;
      p.direction = data.direction;
      p.isMoving = data.isMoving;
      p.isInRover = data.isInRover;

      socket.to(currentRoomId).emit('player_moved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        direction: data.direction,
        isMoving: data.isMoving,
        isInRover: data.isInRover,
      });
    }
  });

  socket.on('player_emote', (data: { emote: string }) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('player_emoted', {
      id: socket.id,
      emote: data.emote,
    });
  });

  let lastBuildAt = 0;
  socket.on('place_building', (data: { recipeId: string; x: number; y: number }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const now = Date.now();
    if (now - lastBuildAt < BUILD_COOLDOWN_MS) {
      socket.emit('action_rejected', { action: 'place_building', reason: 'Too fast. Wait a moment.' });
      return;
    }
    const error = validatePlacement(room, data || {});
    if (error) {
      socket.emit('action_rejected', { action: 'place_building', reason: error });
      return;
    }
    lastBuildAt = now;

    const newBuilding = {
      instanceId: `b-${Date.now()}-${socket.id.substring(0, 4)}`,
      recipeId: data.recipeId,
      x: data.x,
      y: data.y,
      status: 'active',
      health: 100,
      dustAccumulation: 0,
      placedBy: socket.id,
    };

    room.buildings.push(newBuilding);
    io.in(currentRoomId).emit('building_placed', newBuilding);
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(socket.id);
        socket.to(currentRoomId).emit('player_left', { id: socket.id });
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
  });
});

// Setup Vite middlewares in development or static in production
// `npm start` passes --prod (works on Windows too, unlike NODE_ENV=production in a script)
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MOONBOUND server active at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.MOONBOUND_NO_LISTEN) {
  startServer();
}
