'use client';

import { useGame } from '../game/store';
import { SPECIES } from '../game/species';
import { RODS, UPGRADES, upgradeCost } from '../game/economy';
import { playSfx } from '../audio/manager';
import { motion, AnimatePresence } from 'framer-motion';

const RARITY_CLS: Record<string, string> = {
  common: 'text-slate-300',
  uncommon: 'text-emerald-300',
  rare: 'text-blue-300',
  legendary: 'text-amber-300',
};

export default function Panels({
  open,
  onClose,
}: {
  open: 'collection' | 'shop' | null;
  onClose(): void;
}) {
  const profile = useGame((s) => s.profile);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const buyRod = useGame((s) => s.buyRod);
  const stats = useGame((s) => s.stats);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="absolute inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-slate-900/97 p-5 backdrop-blur-lg"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                {open === 'collection' ? '📖 Bộ sưu tập' : '🛒 Cửa hàng'}
              </h2>
              <span className="rounded-full bg-black/40 px-3 py-1 text-sm font-bold text-amber-300">
                🪙 {profile.coins}
              </span>
            </div>

            {open === 'collection' ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SPECIES.map((sp) => {
                  const rec = profile.collection[sp.id];
                  return (
                    <div
                      key={sp.id}
                      className={`rounded-2xl border border-white/10 p-3 text-center ${
                        rec ? 'bg-white/8' : 'bg-black/30 opacity-60'
                      }`}
                    >
                      <div
                        className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                        style={{ background: rec ? `${sp.colors[0]}44` : '#ffffff10' }}
                      >
                        {rec ? '🐟' : '❓'}
                      </div>
                      <div className={`text-xs font-bold ${rec ? RARITY_CLS[sp.rarity] : 'text-white/40'}`}>
                        {rec ? sp.name : '???'}
                      </div>
                      {rec && (
                        <div className="mt-0.5 text-[10px] text-white/50">
                          ×{rec.count} · kỷ lục {rec.maxWeight.toFixed(2)}kg
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/50">Cần câu</div>
                {RODS.map((rod) => {
                  const owned = profile.rodId === rod.id;
                  const locked = profile.level < rod.minLevel;
                  const canBuy = !owned && !locked && profile.coins >= rod.price;
                  return (
                    <div
                      key={rod.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">
                          {rod.name} {owned && <span className="text-cyan-300">· đang dùng</span>}
                        </div>
                        <div className="text-[11px] text-white/50">
                          Lực ×{rod.stats.strength} · Quay ×{rod.stats.reel}
                          {locked && <span className="text-red-300"> · cần Lv {rod.minLevel}</span>}
                        </div>
                      </div>
                      <button
                        disabled={!canBuy}
                        onClick={() => { buyRod(rod.id); playSfx('click'); }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                          owned
                            ? 'bg-cyan-600/40 text-cyan-200'
                            : canBuy
                              ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                              : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {owned ? '✓' : `${rod.price} 🪙`}
                      </button>
                    </div>
                  );
                })}

                <div className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-widest text-white/50">
                  Nâng cấp
                </div>
                {UPGRADES.map((u) => {
                  const tier = profile.upgrades[u.id];
                  const maxed = tier >= u.tiers;
                  const cost = upgradeCost(u.id, tier);
                  const canBuy = !maxed && profile.coins >= cost;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{u.name}</div>
                        <div className="text-[11px] text-white/50">{u.desc}</div>
                        <div className="mt-1 flex gap-0.5">
                          {Array.from({ length: u.tiers }, (_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-4 rounded-full ${i < tier ? 'bg-cyan-400' : 'bg-white/15'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        disabled={!canBuy}
                        onClick={() => { buyUpgrade(u.id); playSfx('click'); }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                          maxed
                            ? 'bg-white/10 text-white/40'
                            : canBuy
                              ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                              : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {maxed ? 'MAX' : `${cost} 🪙`}
                      </button>
                    </div>
                  );
                })}
                <div className="rounded-xl bg-black/30 p-3 text-[11px] text-white/50">
                  Chỉ số hiện tại: chịu lực {Math.round(stats.tensionMax)} · tốc độ quay{' '}
                  {stats.reelSpeed.toFixed(2)}× · vùng an toàn {Math.round(stats.greenLo * 100)}–
                  {Math.round(stats.greenHi * 100)}%
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
