/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lineup, Player } from '../types';
import { Shield, User } from 'lucide-react';
import { translateTextKu } from '../lib/translations';

interface SoccerFieldProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamKu: string;
  awayTeamKu: string;
  lineups: {
    home: Lineup;
    away: Lineup;
  };
}

export default function SoccerField({
  homeTeamName,
  awayTeamName,
  homeTeamKu,
  awayTeamKu,
  lineups,
}: SoccerFieldProps) {
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');

  if (!lineups || !lineups.home || !lineups.away) {
    return (
      <div className="bg-[#0c101d] rounded-xl border border-white/10 p-6 shadow-xl text-center flex flex-col items-center py-12">
        <Shield className="w-14 h-14 text-yellow-500/20 mb-4 animate-pulse" />
        <h3 className="text-white font-bold text-lg mb-2">پێکهاتە هێشتا بەردەست نییە</h3>
      </div>
    );
  }

  const currentLineup = activeSide === 'home' ? lineups.home : lineups.away;
  const currentTeamKu = activeSide === 'home' ? homeTeamKu : awayTeamKu;

  // Group players by position for a clean grid fallback list
  const goalkeepers = currentLineup.players.filter((p) => p.position === 'G');
  const defenders = currentLineup.players.filter((p) => p.position === 'D');
  const midfielders = currentLineup.players.filter((p) => p.position === 'M');
  const forwards = currentLineup.players.filter((p) => p.position === 'F');

  return (
    <div id="soccer-field-tactical-board" className="bg-[#0c101d] rounded-xl border border-white/10 p-4 md:p-6 shadow-xl">
      {/* Pitch Selector */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-gold-bright font-bold text-lg leading-tight md:text-xl">
            پێکهاتەی تیمەکان <span className="text-white">({currentLineup.formation})</span>
          </h3>
        </div>
        <div className="flex gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5 text-sm">
          <button
            id="toggle-home-lineup"
            onClick={() => setActiveSide('home')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSide === 'home'
                ? 'bg-gold-bright text-black font-bold'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {homeTeamKu}
          </button>
          <button
            id="toggle-away-lineup"
            onClick={() => setActiveSide('away')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSide === 'away'
                ? 'bg-gold-bright text-black font-bold'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {awayTeamKu}
          </button>
        </div>
      </div>

      {/* Visual Field Pitch */}
      <div className="relative w-full aspect-[4/3] max-w-xl mx-auto rounded-lg overflow-hidden border border-white/10 bg-[#060b13] shadow-inner select-none mb-6">
        {/* Pitch Lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-25 pointer-events-none">
          {/* Half Field Outline */}
          <div className="w-full h-full border border-gold-bright flex flex-col justify-between">
            {/* Top goal box */}
            <div className="w-1/2 h-1/6 border-x border-b border-gold-bright mx-auto" />
            
            {/* Center line */}
            <div className="w-full h-px border-t border-gold-bright my-auto flex justify-center items-center">
              {/* Center Circle */}
              <div className="w-24 h-24 border border-gold-bright rounded-full flex-shrink-0 absolute" />
            </div>

            {/* Bottom goal box */}
            <div className="w-1/2 h-1/6 border-x border-t border-gold-bright mx-auto" />
          </div>
        </div>

        {/* Grass Pattern Subtle Alternating Rows */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className={`w-full h-1/6 ${idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}
            />
          ))}
        </div>

        {/* Players Tactical Overlay Grid */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between">
          {currentLineup.players.map((player) => {
            // Compute percentage positions
            const left = `${((player.gridX || 3) - 1) * 20 + 10}%`;
            const bottom = `${((player.gridY || 1.5) - 1) * 20 + 8}%`;

            return (
              <div
                key={player.id}
                style={{ left, bottom }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
              >
                {/* Player Circle */}
                <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#0a0e1a] text-white shadow-lg border-2 border-gold-bright flex items-center justify-center font-display text-xs md:text-sm font-bold group-hover:bg-gold-bright group-hover:text-black transition-all z-10">
                  {player.number}
                  {/* Subtle Position Indicator Mini badge */}
                  <span className="absolute -bottom-1 -right-1 text-[8px] px-1 bg-black text-white rounded font-mono">
                    {player.position}
                  </span>
                </div>
                {/* Player Name Tag */}
                <div className="mt-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] md:text-xs text-center border border-white/5 font-sans max-w-[80px] truncate whitespace-nowrap shadow-md group-hover:border-gold-bright" title={translateTextKu(player.name)}>
                  {translateTextKu(player.name)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roster Detailed List View */}
      <div className="grid grid-cols-2 gap-4 text-xs font-sans text-white/70 md:grid-cols-4 mt-6">
          {/* Goalkeepers */}
        <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
          <h4 className="text-gold-cream font-bold border-b border-white/5 pb-1 mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
            گۆڵپارێز (G)
          </h4>
          <div className="space-y-1.5">
            {goalkeepers.map((p) => (
              <div key={p.id} className="flex justify-between items-center font-mono">
                <span className="font-sans text-white text-ellipsis overflow-hidden" title={translateTextKu(p.name)}>{translateTextKu(p.name)}</span>
                <span className="text-white/40 bg-white/5 px-1 rounded">#{p.number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Defenders */}
        <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
          <h4 className="text-gold-cream font-bold border-b border-white/5 pb-1 mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            بەرگری (D)
          </h4>
          <div className="space-y-1.5">
            {defenders.map((p) => (
              <div key={p.id} className="flex justify-between items-center font-mono">
                <span className="font-sans text-white text-ellipsis overflow-hidden" title={translateTextKu(p.name)}>{translateTextKu(p.name)}</span>
                <span className="text-white/40 bg-white/5 px-1 rounded">#{p.number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Midfielders */}
        <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
          <h4 className="text-gold-cream font-bold border-b border-white/5 pb-1 mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            ناوەڕاست (M)
          </h4>
          <div className="space-y-1.5">
            {midfielders.map((p) => (
              <div key={p.id} className="flex justify-between items-center font-mono">
                <span className="font-sans text-white text-ellipsis overflow-hidden" title={translateTextKu(p.name)}>{translateTextKu(p.name)}</span>
                <span className="text-white/40 bg-white/5 px-1 rounded">#{p.number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Forwards */}
        <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
          <h4 className="text-gold-cream font-bold border-b border-white/5 pb-1 mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            هێرشبەر (F)
          </h4>
          <div className="space-y-1.5">
            {forwards.map((p) => (
              <div key={p.id} className="flex justify-between items-center font-mono">
                <span className="font-sans text-white text-ellipsis overflow-hidden" title={translateTextKu(p.name)}>{translateTextKu(p.name)}</span>
                <span className="text-white/40 bg-white/5 px-1 rounded">#{p.number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
