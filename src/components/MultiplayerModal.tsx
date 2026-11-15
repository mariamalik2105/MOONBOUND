import React, { useState } from 'react';
import { X, Users, Wifi, Globe, Shield, Play } from 'lucide-react';
import { sound } from '../game/audio';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomId: string, name: string) => void;
  isConnected: boolean;
  activeRoomId?: string;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  isConnected,
  activeRoomId,
}) => {
  const [roomId, setRoomId] = useState('artemis-base-1');
  const [callsign, setCallsign] = useState('Commander-1');

  if (!isOpen) return null;

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="mb-card bg-moon-panel border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">COOPERATIVE MULTIPLAYER EXPEDITION</h2>
              <p className="text-xs text-slate-400">2-4 PLAYERS · SHARED COLONY BUILDINGS</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Join forces with other astronauts to explore the Moon and build one shared base. Each
          player collects and spends their own materials; buildings appear for the whole crew.
        </p>

        {/* Form Inputs */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">ASTRONAUT CALLSIGN / NAME:</label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400"
              placeholder="e.g. Neil, Buzz, Sally..."
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">MISSION ROOM CODE:</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400"
              placeholder="e.g. artemis-base-1"
            />
          </div>
        </div>

        {/* Connection Status Banner */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Wifi className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>
              {isConnected
                ? `Connected to Room: ${activeRoomId || roomId}`
                : 'Ready to connect to multiplayer server'}
            </span>
          </div>
          <span className="text-xs text-cyan-400">SOCKET.IO V4</span>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              sound.playVictory();
              onJoinRoom(roomId, callsign);
              onClose();
            }}
            className="flex items-center space-x-2 bg-cyan-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Connect & Enter Base</span>
          </button>
        </div>
      </div>
    </div>
  );
};
