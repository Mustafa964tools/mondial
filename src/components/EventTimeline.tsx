/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MatchEvent, Team } from '../types';
import { Trophy, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { translateTextKu } from '../lib/translations';

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeam: Team;
  awayTeam: Team;
}

export default function EventTimeline({ events, homeTeam, awayTeam }: EventTimelineProps) {
  // Sort events chronologically, with highest minute last
  const sortedEvents = [...events].sort((a, b) => a.minute - b.minute);

  if (sortedEvents.length === 0) {
    return (
      <div id="timeline-empty-state" className="bg-[#0c101d] rounded-xl border border-white/10 p-6 shadow-xl text-center">
        <p className="text-white/60 text-sm">هیچ رووداوێکی تۆمارکراو نییە.</p>
        <p className="text-white/30 text-[11px] font-mono mt-1">No major match events have occurred yet.</p>
      </div>
    );
  }

  return (
    <div id="match-events-timeline" className="bg-[#0c101d] rounded-xl border border-white/10 p-4 md:p-6 shadow-xl">
      <h3 className="text-gold-bright font-bold text-lg border-b border-white/5 pb-2 mb-6">
        رووداوە چڕیەکانی یارییەکە <span className="text-white/40 text-xs font-mono">/ Timeline</span>
      </h3>

      {/* Vertical Timeline container */}
      <div className="relative border-l border-white/15 ml-4 pl-6 space-y-6 md:space-y-8">
        {sortedEvents.map((event) => {
          const isHome = event.teamId === homeTeam.id;
          const activeTeam = isHome ? homeTeam : awayTeam;

          return (
            <div key={event.id} className="relative flex items-start gap-4">
              {/* Event Circle Dot Pin on Line */}
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-black border-2 border-gold-bright flex items-center justify-center z-10 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-bright" />
              </div>

              {/* Minute Badge */}
              <span className="text-gold-bright font-display font-bold text-sm bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {event.minute}'
              </span>

              {/* Event Main Content Card */}
              <div className="flex-1 bg-[#161d30]/30 p-3.5 rounded-lg border border-white/5 flex items-center justify-between gap-4" dir="rtl">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Event Icons with Explicit Labels */}
                    {event.type === 'goal' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-gold-bright text-xs font-bold font-sans">
                        <Trophy className="w-3.5 h-3.5" />
                        گۆڵ
                      </span>
                    )}
                    {event.type === 'card' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-xs font-bold font-sans">
                        <span
                          className={`w-2.5 h-3.5 rounded-sm block ${
                            event.cardType === 'red' ? 'bg-rose-500' : 'bg-yellow-400'
                          } border border-black/30`}
                        />
                        {event.cardType === 'red' ? (
                          <span className="text-rose-400">کارتی سوور</span>
                        ) : (
                          <span className="text-yellow-400">کارتی زەرد</span>
                        )}
                      </span>
                    )}
                    {event.type === 'sub' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-white/70 text-xs font-bold font-sans">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        گۆڕانکاری
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Scorer / Player */}
                      <span className="font-sans font-semibold text-white tracking-wide">
                        {translateTextKu(event.detail)}
                      </span>
                      
                      {/* Kurdish team ownership info */}
                      <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-md font-sans">
                        {activeTeam.nameKu}
                      </span>
                    </div>
                  </div>

                  {/* Subtitle Details: Assists or In/Out players */}
                  {event.type === 'goal' && event.assist && (
                    <div className="text-[11px] text-white/50 pr-2 font-sans">
                      یارمەتیدەر: <span className="font-medium text-white">{translateTextKu(event.assist)}</span>
                    </div>
                  )}

                  {event.type === 'sub' && (
                    <div className="space-y-0.5 pr-2 text-xs font-sans">
                      <div className="text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        هاتنە ژوورەوە: {translateTextKu(event.playerIn)}
                      </div>
                      <div className="text-rose-400 flex items-center gap-1">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                        چوونە دەرەوە: {translateTextKu(event.playerOut)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Team Visual Crest Dot */}
                {activeTeam.logo && activeTeam.logo.startsWith('#') ? (
                  <span
                    style={{ backgroundColor: activeTeam.logo }}
                    className="w-4 h-4 rounded-full border border-black/60 shadow flex-shrink-0"
                    title={activeTeam.nameKu}
                  />
                ) : (
                  <img
                    src={activeTeam.logo}
                    alt={activeTeam.nameKu}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full border border-white/10 shadow flex-shrink-0 object-contain bg-white p-0.5"
                    title={activeTeam.nameKu}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
