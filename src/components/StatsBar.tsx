/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MatchStats } from '../types';

interface StatsBarProps {
  stats: MatchStats;
  homeColor: string;
  awayColor: string;
}

export default function StatsBar({ stats, homeColor, awayColor }: StatsBarProps) {
  // Safe parsing helper in case stats are uninitialized
  const displayStats = stats || {
    possession: { home: 50, away: 50 },
    shots: { home: 0, away: 0 },
    shotsOnGoal: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
  };

  const statItems = [
    {
      label: 'کۆنترۆڵی تۆپ',
      engLabel: 'Ball Possession',
      homeVal: `${displayStats.possession.home}%`,
      awayVal: `${displayStats.possession.away}%`,
      homeRatio: displayStats.possession.home,
      awayRatio: displayStats.possession.away,
    },
    {
      label: 'لێدانەکان',
      engLabel: 'Total Shots',
      homeVal: displayStats.shots.home,
      awayVal: displayStats.shots.away,
      homeRatio: displayStats.shots.home,
      awayRatio: displayStats.shots.away,
    },
    {
      label: 'لێدان بۆ ناو گۆڵ',
      engLabel: 'Shots on Goal',
      homeVal: displayStats.shotsOnGoal.home,
      awayVal: displayStats.shotsOnGoal.away,
      homeRatio: displayStats.shotsOnGoal.home,
      awayRatio: displayStats.shotsOnGoal.away,
    },
    {
      label: 'کۆڕنەر',
      engLabel: 'Corners',
      homeVal: displayStats.corners.home,
      awayVal: displayStats.corners.away,
      homeRatio: displayStats.corners.home,
      awayRatio: displayStats.corners.away,
    },
    {
      label: 'فاوڵەکان',
      engLabel: 'Fouls Committed',
      homeVal: displayStats.fouls.home,
      awayVal: displayStats.fouls.away,
      homeRatio: displayStats.fouls.home,
      awayRatio: displayStats.fouls.away,
    },
    {
      label: 'کارتی زەرد',
      engLabel: 'Yellow Cards',
      homeVal: displayStats.yellowCards.home,
      awayVal: displayStats.yellowCards.away,
      homeRatio: displayStats.yellowCards.home,
      awayRatio: displayStats.yellowCards.away,
    },
    {
      label: 'کارتی سوور',
      engLabel: 'Red Cards',
      homeVal: displayStats.redCards.home,
      awayVal: displayStats.redCards.away,
      homeRatio: displayStats.redCards.home,
      awayRatio: displayStats.redCards.away,
    },
  ];

  return (
    <div id="match-stats-comparisons" className="space-y-5 bg-[#0c101d] rounded-xl border border-white/10 p-4 md:p-6 shadow-xl">
      <h3 className="text-gold-bright font-bold text-lg border-b border-white/5 pb-2 mb-4">
        ئامارەکانی یارییەکە <span className="text-white/45 text-xs font-mono">/ Live Stats</span>
      </h3>

      <div className="space-y-4">
        {statItems.map((item, idx) => {
          // Calculate percentages for the visual comparing bar
          const total = (Number(item.homeRatio) || 0) + (Number(item.awayRatio) || 0);
          let homePercent = 50;
          let awayPercent = 50;

          if (total > 0) {
            homePercent = ((Number(item.homeRatio) || 0) / total) * 100;
            awayPercent = ((Number(item.awayRatio) || 0) / total) * 100;
          }

          return (
            <div key={idx} className="space-y-1">
              {/* Labels & Values row */}
              <div className="flex justify-between items-center text-xs md:text-sm font-sans">
                <span className="font-mono text-white font-semibold">{item.homeVal}</span>
                <div className="text-center">
                  <p className="text-gray-200 font-medium">{item.label}</p>
                  <p className="text-[10px] text-gray-500 font-mono tracking-tight">{item.engLabel}</p>
                </div>
                <span className="font-mono text-white font-semibold">{item.awayVal}</span>
              </div>

              {/* Graphical bar comparison */}
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${homePercent}%`,
                    backgroundColor: homeColor,
                  }}
                  className="h-full transition-all duration-500 ease-out rounded-l-full border-r border-black/20"
                />
                <div
                  style={{
                    width: `${awayPercent}%`,
                    backgroundColor: awayColor === '#FFFFFF' ? '#8ba2bb' : awayColor,
                  }}
                  className="h-full transition-all duration-500 ease-out rounded-r-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
