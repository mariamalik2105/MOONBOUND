import React, { useEffect, useState } from 'react';
import { X, Check, ShoppingBag, Sparkles, User, Heart, Smile } from 'lucide-react';
import { AVATARS, PETS, EMOTES, AvatarDefinition, PetDefinition, EmoteDefinition } from '../game/economy';
import { ThreeDPreview } from './ThreeDPreview';
import { PetSprite } from './PetSprite';
import { sound } from '../game/audio';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceDollars: number;
  unlockedAvatars: string[];
  unlockedPets: string[];
  unlockedEmotes: string[];
  currentAvatarId: string;
  currentPetId?: string;
  onPurchaseAvatar: (id: string, price: number) => void;
  onSelectAvatar: (id: string) => void;
  onPurchasePet: (id: string, price: number) => void;
  onSelectPet: (id: string) => void;
  onPurchaseEmote: (id: string, price: number) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  spaceDollars,
  unlockedAvatars,
  unlockedPets,
  unlockedEmotes,
  currentAvatarId,
  currentPetId,
  onPurchaseAvatar,
  onSelectAvatar,
  onPurchasePet,
  onSelectPet,
  onPurchaseEmote,
}) => {
  const [tab, setTab] = useState<'avatars' | 'pets' | 'emotes'>('avatars');
  const [selectedPreviewAvatar, setSelectedPreviewAvatar] = useState<string>(currentAvatarId || 'engineer');
  const [selectedPreviewPet, setSelectedPreviewPet] = useState<string>(currentPetId || 'rocky');

  // The shop stays mounted, so start each visit on the astronaut and pet you have now.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPreviewAvatar(currentAvatarId || 'engineer');
    setSelectedPreviewPet(currentPetId || 'rocky');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPreviewAv = AVATARS[selectedPreviewAvatar] || AVATARS.engineer;
  const currentPreviewPetDef = PETS[selectedPreviewPet] || PETS.rocky;

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="mb-card bg-moon-panel border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-moon-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                MISSION ARMORY & COSMETICS
              </h2>
              <p className="text-xs text-slate-400">
                CURRENT BALANCE: <span className="text-amber-400 font-bold">S✦{spaceDollars}</span> · COSMETICS DO NOT COST MATERIALS
              </p>
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

        {/* Tab navigation */}
        <div className="flex items-center space-x-3 px-6 py-3 border-b border-slate-800 bg-slate-900/60 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setTab('avatars');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              tab === 'avatars' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Astronaut Specialists (6)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setTab('pets');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              tab === 'pets' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Lunar Pets & Rocky (6)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setTab('emotes');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              tab === 'emotes' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span>Emotes & Gestures (10)</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'avatars' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 3D Preview Column */}
              <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="text-cyan-400 font-bold">3D SUIT INSPECTOR</span>
                  <span className="text-slate-400">DRAG TO ROTATE</span>
                </div>

                <div className="w-full h-64 sm:h-72 my-2">
                  <ThreeDPreview
                    type="avatar"
                    itemId={currentPreviewAv.id}
                    suitColor={currentPreviewAv.suitColor}
                    accentColor={currentPreviewAv.accentColor}
                  />
                </div>

                <div className="w-full bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-left">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>{currentPreviewAv.name}</span>
                    <span className="text-xs text-cyan-400">{currentPreviewAv.role}</span>
                  </div>
                  <div className="text-xs text-emerald-400 mt-1 font-bold">
                    Specialty: {currentPreviewAv.ability.split(' But:')[0]}
                  </div>
                  <div className="text-xs text-orange-300 mt-1">Trade-off: {currentPreviewAv.tradeoff}</div>
                  <div className="text-xs text-slate-400 mt-1">{currentPreviewAv.description}</div>
                </div>
              </div>

              {/* Avatars Grid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.values(AVATARS).map((av) => {
                  const isOwned = unlockedAvatars.includes(av.id);
                  const isSelected = currentAvatarId === av.id;
                  const canAfford = spaceDollars >= av.price;

                  return (
                    <div
                      key={av.id}
                      onClick={() => setSelectedPreviewAvatar(av.id)}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                        selectedPreviewAvatar === av.id
                          ? 'border-cyan-400 bg-slate-900 shadow-md ring-1 ring-cyan-400/40'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{av.name}</span>
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: av.suitColor }} />
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{av.role}</div>
                        <div className="text-xs text-cyan-300 mt-2 font-medium line-clamp-2">
                          + {av.ability.split(' But:')[0]}
                        </div>
                        <div className="text-xs text-orange-300 mt-1 line-clamp-1">− {av.tradeoff}</div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                        {isOwned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playClick();
                              setSelectedPreviewAvatar(av.id);
                              onSelectAvatar(av.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'Equipped' : 'Select Suit'}
                          </button>
                        ) : (
                          <button
                            disabled={!canAfford}
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playVictory();
                              setSelectedPreviewAvatar(av.id);
                              onPurchaseAvatar(av.id, av.price);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Buy S✦{av.price}
                          </button>
                        )}
                        <span className="text-xs text-amber-400 font-bold">S✦{av.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'pets' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Pet 3D Preview */}
              <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold">PET COMPANION</span>
                  <span className="text-slate-400">AS SEEN ON THE MOON</span>
                </div>

                <div className="relative w-full h-64 sm:h-72 my-2 flex items-end justify-center">
                  {/* patch of lunar ground in the game's grey, so the pet reads like it does in play */}
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-[50%]"
                    style={{ background: 'radial-gradient(ellipse at center, #a7a39b 0%, #8f8b84 60%, rgba(143,139,132,0) 100%)' }}
                    aria-hidden
                  />
                  <PetSprite
                    petId={currentPreviewPetDef.id}
                    animate
                    label={`${currentPreviewPetDef.name}, as it looks in the game`}
                    className="relative w-full h-full"
                  />
                </div>

                <div className="w-full bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-left">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>{currentPreviewPetDef.name}</span>
                    <span className="text-xs text-amber-400">{currentPreviewPetDef.species}</span>
                  </div>
                  <div className="text-xs text-emerald-400 mt-1 font-bold">
                    Perk: {currentPreviewPetDef.ability}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{currentPreviewPetDef.personality}</div>
                </div>
              </div>

              {/* Pets Grid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.values(PETS).map((pet) => {
                  const isOwned = unlockedPets.includes(pet.id);
                  const isSelected = currentPetId === pet.id;
                  const canAfford = spaceDollars >= pet.price;

                  return (
                    <div
                      key={pet.id}
                      onClick={() => setSelectedPreviewPet(pet.id)}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                        selectedPreviewPet === pet.id
                          ? 'border-amber-400 bg-slate-900 shadow-md ring-1 ring-amber-400/40'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-white">{pet.name}</span>
                          <PetSprite petId={pet.id} className="w-10 h-10 shrink-0 -my-2" />
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{pet.species}</div>
                        <div className="text-xs text-emerald-300 mt-2 font-medium line-clamp-2">
                          {pet.ability}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                        {isOwned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playClick();
                              setSelectedPreviewPet(pet.id);
                              onSelectPet(pet.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'Active Pet' : 'Equip Pet'}
                          </button>
                        ) : (
                          <button
                            disabled={!canAfford}
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playVictory();
                              setSelectedPreviewPet(pet.id);
                              onPurchasePet(pet.id, pet.price);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Adopt S✦{pet.price}
                          </button>
                        )}
                        <span className="text-xs text-amber-400 font-bold">S✦{pet.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'emotes' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {Object.values(EMOTES).map((em) => {
                const isOwned = unlockedEmotes.includes(em.id);
                const canAfford = spaceDollars >= em.price;

                return (
                  <div
                    key={em.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-between text-center space-y-2"
                  >
                    <div className="text-3xl my-1">{em.icon}</div>
                    <div>
                      <div className="font-bold text-sm text-white">{em.name}</div>
                      <div className="text-xs text-slate-400">{em.description}</div>
                    </div>

                    <div className="w-full pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-bold">S✦{em.price}</span>
                      {isOwned ? (
                        <span className="text-emerald-400 text-xs font-bold">OWNED</span>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            sound.playVictory();
                            onPurchaseEmote(em.id, em.price);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            canAfford ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
