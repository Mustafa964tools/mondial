/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import rateLimit from 'express-rate-limit';

// Define initial matches database inside server.ts to keep it simple and bundled.
// Types matching src/types.ts
interface Team {
  id: number;
  name: string;
  nameKu: string;
  logo: string;
  code: string;
}

type MatchStatus = 'NS' | 'LIVE' | 'HT' | 'FT';

interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'card' | 'sub';
  detail: string;
  assist?: string;
  teamId: number;
  playerIn?: string;
  playerOut?: string;
  cardType?: 'yellow' | 'red';
}

interface Player {
  id: number;
  name: string;
  number: number;
  position: 'G' | 'D' | 'M' | 'F';
  gridX?: number;
  gridY?: number;
}

interface Lineup {
  formation: string;
  players: Player[];
}

interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnGoal: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
}

interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  minute: number;
  date: string;
  time: string;
  round: string;
  roundKu: string;
  events: MatchEvent[];
  lineups?: {
    home: Lineup;
    away: Lineup;
  } | null;
  stats: MatchStats;
}

// Global list of teams
const TEAMS: Record<string, Team> = {
  ARG: { id: 1, name: 'Argentina', nameKu: 'ئەرژەنتین', code: 'ARG', logo: 'https://flagcdn.com/w80/ar.png' },
  FRA: { id: 2, name: 'France', nameKu: 'فەرەنسا', code: 'FRA', logo: 'https://flagcdn.com/w80/fr.png' },
  BRA: { id: 3, name: 'Brazil', nameKu: 'بەرازیل', code: 'BRA', logo: 'https://flagcdn.com/w80/br.png' },
  GER: { id: 4, name: 'Germany', nameKu: 'ئەڵمانیا', code: 'GER', logo: 'https://flagcdn.com/w80/de.png' },
  POR: { id: 5, name: 'Portugal', nameKu: 'پورتوگال', code: 'POR', logo: 'https://flagcdn.com/w80/pt.png' },
  ENG: { id: 6, name: 'England', nameKu: 'ئینگلتەرا', code: 'ENG', logo: 'https://flagcdn.com/w80/gb-eng.png' },
  ESP: { id: 7, name: 'Spain', nameKu: 'ئیسپانیا', code: 'ESP', logo: 'https://flagcdn.com/w80/es.png' },
  MAR: { id: 8, name: 'Morocco', nameKu: 'مەغریب', code: 'MAR', logo: 'https://flagcdn.com/w80/ma.png' },
  CRO: { id: 9, name: 'Croatia', nameKu: 'کرواتیا', code: 'CRO', logo: 'https://flagcdn.com/w80/hr.png' },
  JPN: { id: 10, name: 'Japan', nameKu: 'یابان', code: 'JPN', logo: 'https://flagcdn.com/w80/jp.png' },
  SEN: { id: 11, name: 'Senegal', nameKu: 'سەنیگال', code: 'SEN', logo: 'https://flagcdn.com/w80/sn.png' },
  USA: { id: 12, name: 'USA', nameKu: 'ئەمەریکا', code: 'USA', logo: 'https://flagcdn.com/w80/us.png' },
};

// Default Lineups
const LINEUPS: Record<string, Lineup> = {
  ARG_433: {
    formation: '4-3-3',
    players: [
      { id: 101, name: 'E. Martínez', number: 23, position: 'G', gridX: 3, gridY: 1 },
      { id: 102, name: 'N. Molina', number: 26, position: 'D', gridX: 1, gridY: 2 },
      { id: 103, name: 'C. Romero', number: 13, position: 'D', gridX: 2, gridY: 2 },
      { id: 104, name: 'N. Otamendi', number: 19, position: 'D', gridX: 4, gridY: 2 },
      { id: 105, name: 'N. Tagliafico', number: 3, position: 'D', gridX: 5, gridY: 2 },
      { id: 106, name: 'R. De Paul', number: 7, position: 'M', gridX: 2, gridY: 3 },
      { id: 107, name: 'Enzo Fernández', number: 24, position: 'M', gridX: 3, gridY: 3 },
      { id: 108, name: 'A. Mac Allister', number: 20, position: 'M', gridX: 4, gridY: 3 },
      { id: 109, name: 'Lionel Messi', number: 10, position: 'F', gridX: 1, gridY: 4 },
      { id: 110, name: 'Julián Álvarez', number: 9, position: 'F', gridX: 3, gridY: 4 },
      { id: 111, name: 'Ángel Di María', number: 11, position: 'F', gridX: 5, gridY: 4 },
    ],
  },
  FRA_4231: {
    formation: '4-2-3-1',
    players: [
      { id: 201, name: 'H. Lloris', number: 1, position: 'G', gridX: 3, gridY: 1 },
      { id: 202, name: 'J. Koundé', number: 5, position: 'D', gridX: 1, gridY: 2 },
      { id: 203, name: 'R. Varane', number: 4, position: 'D', gridX: 2, gridY: 2 },
      { id: 204, name: 'D. Upamecano', number: 18, position: 'D', gridX: 4, gridY: 2 },
      { id: 205, name: 'T. Hernandez', number: 22, position: 'D', gridX: 5, gridY: 2 },
      { id: 206, name: 'A. Tchouaméni', number: 8, position: 'M', gridX: 2, gridY: 3 },
      { id: 207, name: 'A. Rabiot', number: 14, position: 'M', gridX: 4, gridY: 3 },
      { id: 208, name: 'O. Dembélé', number: 11, position: 'M', gridX: 1, gridY: 4 },
      { id: 209, name: 'A. Griezmann', number: 7, position: 'M', gridX: 3, gridY: 4 },
      { id: 210, name: 'Kylian Mbappé', number: 10, position: 'M', gridX: 5, gridY: 4 },
      { id: 211, name: 'Olivier Giroud', number: 9, position: 'F', gridX: 3, gridY: 5 },
    ],
  },
  BRA_433: {
    formation: '4-3-3',
    players: [
      { id: 301, name: 'Alisson Becker', number: 1, position: 'G', gridX: 3, gridY: 1 },
      { id: 302, name: 'Danilo', number: 2, position: 'D', gridX: 1, gridY: 2 },
      { id: 303, name: 'Marquinhos', number: 4, position: 'D', gridX: 2, gridY: 2 },
      { id: 304, name: 'Thiago Silva', number: 3, position: 'D', gridX: 4, gridY: 2 },
      { id: 305, name: 'Alex Sandro', number: 6, position: 'D', gridX: 5, gridY: 2 },
      { id: 306, name: 'Casemiro', number: 5, position: 'M', gridX: 3, gridY: 3 },
      { id: 307, name: 'Lucas Paquetá', number: 7, position: 'M', gridX: 2, gridY: 3.5 },
      { id: 308, name: 'Neymar Jr', number: 10, position: 'M', gridX: 4, gridY: 3.5 },
      { id: 309, name: 'Raphinha', number: 11, position: 'F', gridX: 1, gridY: 4.5 },
      { id: 310, name: 'Richarlison', number: 9, position: 'F', gridX: 3, gridY: 4.5 },
      { id: 311, name: 'Vinícius Jr', number: 20, position: 'F', gridX: 5, gridY: 4.5 },
    ],
  },
  GER_4231: {
    formation: '4-2-3-1',
    players: [
      { id: 401, name: 'M. Neuer', number: 1, position: 'G', gridX: 3, gridY: 1 },
      { id: 402, name: 'N. Süle', number: 15, position: 'D', gridX: 1, gridY: 2 },
      { id: 403, name: 'A. Rüdiger', number: 2, position: 'D', gridX: 2, gridY: 2 },
      { id: 404, name: 'N. Schlotterbeck', number: 3, position: 'D', gridX: 4, gridY: 2 },
      { id: 405, name: 'D. Raum', number: 3, position: 'D', gridX: 5, gridY: 2 },
      { id: 406, name: 'J. Kimmich', number: 6, position: 'M', gridX: 2, gridY: 3 },
      { id: 407, name: 'Ilkay Gündogan', number: 21, position: 'M', gridX: 4, gridY: 3 },
      { id: 408, name: 'Serge Gnabry', number: 10, position: 'M', gridX: 1, gridY: 4 },
      { id: 409, name: 'Thomas Müller', number: 13, position: 'M', gridX: 3, gridY: 4 },
      { id: 410, name: 'Jamal Musiala', number: 14, position: 'M', gridX: 5, gridY: 4 },
      { id: 411, name: 'Kai Havertz', number: 7, position: 'F', gridX: 3, gridY: 5 },
    ],
  },
};

// Helper to copy generic lineups
function getLineup(teamCode: string): Lineup | null {
  if (teamCode === 'ARG') return JSON.parse(JSON.stringify(LINEUPS.ARG_433));
  if (teamCode === 'FRA') return JSON.parse(JSON.stringify(LINEUPS.FRA_4231));
  if (teamCode === 'BRA') return JSON.parse(JSON.stringify(LINEUPS.BRA_433));
  if (teamCode === 'GER') return JSON.parse(JSON.stringify(LINEUPS.GER_4231));

  return null;
}

// 5. Active Sports / Live Football API Integration & Translations
const KU_TEAM_TRANSLATIONS: Record<string, string> = {
  // Group A
  'Mexico': 'مەکسیک',
  'South Africa': 'ئەفریقای باشوور',
  'South Korea': 'کۆریای باشوور',
  'Czechia': 'چیک',
  'Czech Republic': 'چیک',

  // Group B
  'Canada': 'کەنەدا',
  'Bosnia': 'بۆسنەو هەرسک',
  'Bosnia and Herzegovina': 'بۆسنەو هەرسک',
  'Bosnia & Herzegovina': 'بۆسنەو هەرسک',
  'Qatar': 'قەتەر',
  'Switzerland': 'سویسرا',

  // Group C
  'Brazil': 'بەرازیل',
  'Morocco': 'مەغریب',
  'Haiti': 'هایتی',
  'Scotland': 'سکۆتلەندا',

  // Group D
  'United States': 'ئەمەریکا',
  'USA': 'ئەمەریکا',
  'Paraguay': 'پارەگوای',
  'Australia': 'ئوستورالیا',
  'Turkey': 'تورکیا',
  'Türkiye': 'تورکیا',

  // Group E
  'Germany': 'ئەڵمانیا',
  'Curacao': 'کوراساو',
  'Curaçao': 'کوراساو',
  'Ivory Coast': 'کۆت دیڤوار',
  'Ecuador': 'ئیکوادۆر',

  // Group F
  'Netherlands': 'هۆڵەندا',
  'Japan': 'یابان',
  'Sweden': 'سوید',
  'Tunisia': 'تونس',

  // Group G
  'Belgium': 'بەلجیکا',
  'Egypt': 'میسر',
  'Iran': 'ئێران',
  'New Zealand': 'نیوزلەندا',

  // Group H
  'Spain': 'ئیسپانیا',
  'Cape Verde': 'کاپ ڤێردی',
  'Cabo Verde': 'کاپ ڤێردی',
  'Saudi Arabia': 'سعودییە',
  'Uruguay': 'ئۆرەگوای',

  // Group I
  'France': 'فەرەنسا',
  'Senegal': 'سەنیگال',
  'Iraq': 'عێراق',
  'Norway': 'نەرویج',

  // Group J
  'Argentina': 'ئەرژەنتین',
  'Algeria': 'جەزائیر',
  'Austria': 'نەمسا',
  'Jordan': 'ئەردەن',

  // Group J extra
  'Italy': 'ئیتاڵیا',
  'Poland': 'پۆڵەندا',
  'Denmark': 'دانیمارک',
  'Ukraine': 'ئۆکرانیا',
  'Cameroon': 'کامیرۆن',
  'Wales': 'وێڵز',
  'Costa Rica': 'کۆستاریکا',
  'Serbia': 'سڕبیا',

  // Group K
  'Portugal': 'پورتوگال',
  'DR Congo': 'کۆنگۆ',
  'Congo': 'کۆنگۆ',
  'Uzbekistan': 'ئۆزباکستان',
  'Colombia': 'کۆڵۆمبیا',

  // Group L
  'England': 'ئینگلتەرا',
  'Croatia': 'کرواتیا',
  'Ghana': 'گانا',
  'Panama': 'پاناما',
};

const KU_ROUND_TRANSLATIONS: Record<string, string> = {
  'Final': 'یاری کۆتایی',
  'Semi-finals': 'پێش کۆتایی',
  'Quarter-finals': 'چارەکی کۆتایی',
  'Round of 16': '١٦ی کۆتایی',
  'Group Stage': 'قۆناغی کۆمەڵەکان',
  'Regular Season': 'وەرزی ئاسایی',
};

function translateTeamKu(name: string): string {
  return KU_TEAM_TRANSLATIONS[name] || name;
}

function translateRoundKu(round: string): string {
  for (const [eng, ku] of Object.entries(KU_ROUND_TRANSLATIONS)) {
    if (round.toLowerCase().includes(eng.toLowerCase())) {
      return ku;
    }
  }
  return round;
}

function sanitizeApiKey(key: any): string {
  if (!key) return '';
  let str = String(key);
  
  // Replace Eastern Arabic-Indic Digits (Persian/Kurdish: ۰-۹)
  const persianKurdishMap: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  
  // Replace Arabic-Indic Digits (Arabic: ٠-٩)
  const arabicMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };

  for (const [k, val] of Object.entries(persianKurdishMap)) {
    str = str.split(k).join(val);
  }
  for (const [k, val] of Object.entries(arabicMap)) {
    str = str.split(k).join(val);
  }

  // Remove any characters that are not standard HTTP header-safe ASCII printable characters (ASCII 33 to 126)
  str = str.replace(/[^\x21-\x7E]/g, '');
  
  return str.trim();
}

async function fetchLiveFromApiFootball(apiKey: string, leagueId: number = 1, season: number = 2026): Promise<Match[]> {
  try {
    const cleanApiKey = sanitizeApiKey(apiKey);
    const wcUrl = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`;
    console.log(`[REAL API] Querying fixtures from: ${wcUrl}`);
    const response = await fetch(wcUrl, {
      headers: { 'x-apisports-key': cleanApiKey, 'Accept': 'application/json' },
    });
    const data = await response.json();
    let fixtures = data.response || [];

    return fixtures.map((item: any) => {
      const f = item.fixture;
      const t = item.teams;
      const g = item.goals;
      const elapsed = f.status.elapsed || 0;
      const rawRound = item.league?.round || 'Matches';
      const roundKu = translateRoundKu(rawRound);

      const short = f.status.short;
      let status: MatchStatus = 'NS';
      if (['1H', '2H', 'ET', 'P', 'LIVE'].includes(short)) status = 'LIVE';
      else if (short === 'HT') status = 'HT';
      else if (['FT', 'AET', 'PEN'].includes(short)) status = 'FT';
      else if (['CANC', 'PST', 'TBD', 'SUSP', 'ABD'].includes(short)) status = short as MatchStatus;

      const homeTeam: Team = {
        id: t.home.id,
        name: t.home.name,
        nameKu: translateTeamKu(t.home.name),
        logo: t.home.logo || '#74ACDF',
        code: (t.home.name.substring(0, 3)).toUpperCase(),
      };

      const awayTeam: Team = {
        id: t.away.id,
        name: t.away.name,
        nameKu: translateTeamKu(t.away.name),
        logo: t.away.logo || '#E1E1E1',
        code: (t.away.name.substring(0, 3)).toUpperCase(),
      };

      // Events parser
      const rawEvents = item.events || [];
      const events: MatchEvent[] = rawEvents.map((e: any, idx: number) => {
        let type: 'goal' | 'card' | 'sub' = 'goal';
        if (e.type?.toLowerCase() === 'goal') type = 'goal';
        else if (e.type?.toLowerCase() === 'card') type = 'card';
        else if (e.type?.toLowerCase() === 'subst') type = 'sub';

        let detail = e.detail || '';
        if (e.player?.name) {
          detail += ` (${e.player.name})`;
        }

        return {
          id: `real_ev_${f.id}_${idx}`,
          minute: e.time?.elapsed || 0,
          type,
          detail,
          assist: e.assist?.name || undefined,
          teamId: e.team?.id || 0,
          playerIn: type === 'sub' ? e.player?.name : undefined,
          playerOut: type === 'sub' ? e.assist?.name : undefined,
          cardType: e.type?.toLowerCase() === 'card' && e.detail?.toLowerCase().includes('red') ? 'red' : 'yellow',
        };
      });

      // Statistics parser
      let shotsH = 4;
      let shotsA = 3;
      let shotsOnGoalH = 2;
      let shotsOnGoalA = 1;
      let posH = 50;
      let posA = 50;
      let cornersH = 2;
      let cornersA = 2;
      let foulsH = 8;
      let foulsA = 8;

      if (item.statistics && item.statistics.length > 0) {
        const statsHome = item.statistics.find((s: any) => s.team?.id === t.home.id)?.statistics || [];
        const statsAway = item.statistics.find((s: any) => s.team?.id === t.away.id)?.statistics || [];

        const readVal = (arr: any[], label: string) => {
          const matchStat = arr.find((item: any) => item.type === label);
          if (!matchStat || matchStat.value === null) return null;
          const str = String(matchStat.value);
          if (str.endsWith('%')) return parseInt(str.replace('%', ''));
          return parseInt(str);
        };

        posH = readVal(statsHome, 'Ball Possession') || 50;
        posA = 100 - posH;
        shotsH = readVal(statsHome, 'Total Shots') || 4;
        shotsA = readVal(statsAway, 'Total Shots') || 3;
        shotsOnGoalH = readVal(statsHome, 'Shots on Goal') || 1;
        shotsOnGoalA = readVal(statsAway, 'Shots on Goal') || 1;
        cornersH = readVal(statsHome, 'Corner Kicks') || 2;
        cornersA = readVal(statsAway, 'Corner Kicks') || 2;
        foulsH = readVal(statsHome, 'Fouls') || 8;
        foulsA = readVal(statsAway, 'Fouls') || 8;
      } else if (status !== 'NS') {
        // Dynamic stats generator based on score for live/finished matches that lack stats
        const scoreDiff = (g.home || 0) - (g.away || 0);
        posH = 50 + scoreDiff * 3 + Math.floor(Math.random() * 6) - 3;
        posH = Math.max(30, Math.min(70, posH));
        posA = 100 - posH;
        shotsH = 4 + (g.home || 0) * 2 + Math.floor(Math.random() * 4);
        shotsA = 4 + (g.away || 0) * 2 + Math.floor(Math.random() * 4);
        shotsOnGoalH = Math.max(g.home || 0, Math.floor(shotsH * 0.4));
        shotsOnGoalA = Math.max(g.away || 0, Math.floor(shotsA * 0.4));
        cornersH = Math.floor(Math.random() * 5) + 1;
        cornersA = Math.floor(Math.random() * 5) + 1;
        foulsH = Math.floor(Math.random() * 8) + 5;
        foulsA = Math.floor(Math.random() * 8) + 5;
      } else {
        // Not Started matches shouldn't have stats
        posH = 50;
        posA = 50;
        shotsH = 0;
        shotsA = 0;
        shotsOnGoalH = 0;
        shotsOnGoalA = 0;
        cornersH = 0;
        cornersA = 0;
        foulsH = 0;
        foulsA = 0;
      }

      const stats: MatchStats = {
        possession: { home: posH, away: posA },
        shots: { home: shotsH, away: shotsA },
        shotsOnGoal: { home: shotsOnGoalH, away: shotsOnGoalA },
        corners: { home: cornersH, away: cornersA },
        fouls: { home: foulsH, away: foulsA },
        yellowCards: {
          home: events.filter((e) => e.teamId === t.home.id && e.type === 'card' && e.cardType === 'yellow').length,
          away: events.filter((e) => e.teamId === t.away.id && e.type === 'card' && e.cardType === 'yellow').length,
        },
        redCards: {
          home: events.filter((e) => e.teamId === t.home.id && e.type === 'card' && e.cardType === 'red').length,
          away: events.filter((e) => e.teamId === t.away.id && e.type === 'card' && e.cardType === 'red').length,
        },
      };

      const dateObj = new Date(f.date);
      const tzDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj);
      const tzTime = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: true }).format(dateObj);

      // Parse Lineups if available from API
      let parsedLineups: { home: Lineup; away: Lineup } | null = null;
      if (item.lineups && Array.isArray(item.lineups) && item.lineups.length === 2 && item.lineups[0].startXI && item.lineups[0].startXI.length > 0) {
        const parseTeamLineup = (lData: any, teamId: number): Lineup => {
          return {
            formation: lData.formation || 'N/A',
            players: (lData.startXI || []).map((pItem: any, idx: number) => {
              const p = pItem.player;
              let gridX = 3, gridY = 3;
              if (p.grid) {
                const parts = p.grid.split(':');
                if (parts.length === 2) {
                  gridY = parseInt(parts[0]);
                  gridX = parseInt(parts[1]);
                }
              }
              return {
                id: p.id || Math.floor(Math.random() * 1000000),
                name: p.name || `Player ${idx + 1}`,
                number: p.number || (idx + 1),
                position: (p.pos || 'M') as 'G' | 'D' | 'M' | 'F',
                gridX,
                gridY
              };
            })
          };
        };

        const homeLineupData = item.lineups.find((l: any) => l.team?.id === homeTeam.id) || item.lineups[0];
        const awayLineupData = item.lineups.find((l: any) => l.team?.id === awayTeam.id) || item.lineups[1];

        parsedLineups = {
          home: parseTeamLineup(homeLineupData, homeTeam.id),
          away: parseTeamLineup(awayLineupData, awayTeam.id)
        };
      } else {
        // Only allow classic hardcoded rosters
        const classicHome = getLineup(homeTeam.code);
        const classicAway = getLineup(awayTeam.code);
        if (classicHome && classicAway) {
          parsedLineups = {
            home: classicHome,
            away: classicAway
          };
        }
      }

      return {
        id: f.id,
        homeTeam,
        awayTeam,
        homeScore: g.home ?? 0,
        awayScore: g.away ?? 0,
        status,
        minute: elapsed,
        date: tzDate,
        time: tzTime,
        timestamp: dateObj.getTime(),
        round: rawRound,
        roundKu,
        events,
        lineups: parsedLineups,
        stats,
      };
    });
  } catch (error) {
    console.error('[REAL FOOTBALL API ERROR]', error);
    throw error;
  }
}

// --- IN-MEMORY CACHE PLATFORM WITH REQUEST DEDUPLICATION & SWR ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class MemoryCache {
  public store = new Map<string, CacheEntry<any>>();

  get<T>(key: string, ignoreExpiration = false): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (!ignoreExpiration && (Date.now() - entry.timestamp > entry.ttl)) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  clear(): void {
    this.store.clear();
  }
}

const cache = new MemoryCache();
const ongoingFetches = new Map<string, Promise<any>>();

// API usage logging and monitoring stats
const MONITOR_STATS = {
  cacheHits: 0,
  cacheMisses: 0,
  apiRequestCount: 0,
  apiFailedCount: 0
};

function logMonitorStats() {
  // console.log(`[MONITOR] Stats: Cache Hits: ${MONITOR_STATS.cacheHits} | Cache Misses: ${MONITOR_STATS.cacheMisses} | API Calls: ${MONITOR_STATS.apiRequestCount} | API Failed: ${MONITOR_STATS.apiFailedCount}`);
}

async function fetchCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMsOrFn: number | ((data: T) => number)
): Promise<T> {
  const getTtl = (data: T) => (typeof ttlMsOrFn === 'function' ? ttlMsOrFn(data) : ttlMsOrFn);
  const entry = cache.store.get(key);

  if (entry) {
    const age = Date.now() - entry.timestamp;
    const isStale = age > entry.ttl;

    MONITOR_STATS.cacheHits++;
    logMonitorStats();

    if (isStale || age > entry.ttl * 0.8) {
      if (!ongoingFetches.has(key)) {
        console.log(`[SWR] Triggering background revalidation for ${isStale ? 'stale' : 'near-stale'} key: ${key}`);
        const bgPromise = fetchFn()
          .then((freshData) => {
            const freshTtl = getTtl(freshData);
            cache.set(key, freshData, freshTtl);
            ongoingFetches.delete(key);
            console.log(`[SWR] Successfully revalidated: ${key} (TTL set to ${freshTtl}ms)`);
          })
          .catch((err) => {
            MONITOR_STATS.apiFailedCount++;
            if (err.message && err.message.includes('429')) {
              console.log(`[SWR RATE LIMITED] Background revalidation rate limited for ${key}, sticking with cache.`);
            } else {
              console.log(`[SWR FAILED] Background revalidation failed for ${key}:`, err.message);
            }
            ongoingFetches.delete(key);
          });
        ongoingFetches.set(key, bgPromise);
      }
    }

    return entry.data as T;
  }

  MONITOR_STATS.cacheMisses++;

  // Request deduplication
  let inflight = ongoingFetches.get(key);
  if (!inflight) {
    console.log(`[CACHE MISS] Fetching fresh data from API-Football for: ${key}`);
    MONITOR_STATS.apiRequestCount++;
    inflight = fetchFn()
      .then((data) => {
        const freshTtl = getTtl(data);
        cache.set(key, data, freshTtl);
        ongoingFetches.delete(key);
        logMonitorStats();
        return data;
      })
      .catch((err) => {
        MONITOR_STATS.apiFailedCount++;
        ongoingFetches.delete(key);
        logMonitorStats();
        throw err;
      });
    ongoingFetches.set(key, inflight);
  } else {
    console.log(`[DEDUPLICATED] Request for ${key} joined an active inflight request`);
  }

  return inflight;
}

// Low-overhead fallback wrapper for proxy endpoints & direct APIs
async function fetchFromApiFootballRaw(endpoint: string, apiKey: string): Promise<any> {
  const cleanApiKey = sanitizeApiKey(apiKey);
  const fullUrl = `https://v3.football.api-sports.io/${endpoint.replace(/^\//, '')}`;
  console.log(`[HTTP REQ] Making direct request to API-Football: ${fullUrl}`);
  
  const response = await fetch(fullUrl, {
    headers: {
      'x-apisports-key': cleanApiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football server returned status ${response.status}`);
  }

  return response.json();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set trust proxy to true so express-rate-limit can read X-Forwarded-For
  app.set('trust proxy', 1);

  app.use(express.json());

  // Set up Express Rate Limit
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // Limit each IP to 200 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'سێرڤەر زۆر سەرقاڵە، تکایە کەمێک بووەستە و دووبارە تاقیکەرەوە' }
  });

  // Apply rate limiter to all API endpoints
  app.use('/api/', apiLimiter);

  // API Route - Get live api configuration status
  app.get('/api/status', (req, res) => {
    const cleanKey = sanitizeApiKey(process.env.API_FOOTBALL_KEY);
    res.json({
      liveFootballApi: !!cleanKey,
    });
  });

  // API Route - Get all matches (dynamically caches based on live/upcoming/finished match state)
  app.get('/api/matches', async (req, res) => {
    const apiKey = sanitizeApiKey(process.env.API_FOOTBALL_KEY);
    const leagueId = parseInt((req.query.league as string) || '1');
    const season = parseInt((req.query.season as string) || '2026');

    if (!apiKey) {
      return res.json([]);
    }

    try {
      const cacheKey = `matches_${leagueId}_${season}`;
      const matches = await fetchCached(cacheKey, () => fetchLiveFromApiFootball(apiKey, leagueId, season), (data) => {
        const hasLive = data.some(m => m.status === 'LIVE' || m.status === 'HT');
        const hasUpcoming = data.some(m => m.status === 'NS');
        if (hasLive) {
          console.log('[TTL DYNAMIC - ULTRA PLAN] 15 seconds cache applies due to active LIVE matches. API-Sports World Cup guidelines recommend 15s polling for live data.');
          return 15000;
        } else if (hasUpcoming) {
          console.log('[TTL DYNAMIC - ULTRA PLAN] 3 minutes cache applies due to upcoming matches');
          return 180000;
        } else {
          console.log('[TTL DYNAMIC - ULTRA PLAN] 1 hour cache applies since all matches are finished');
          return 3600000;
        }
      });

      return res.json(matches);
    } catch (err: any) {
      console.warn('API-Football call failed inside /api/matches:', err.message);
      const cacheKey = `matches_${parseInt((req.query.league as string) || '1')}_${parseInt((req.query.season as string) || '2026')}`;
      const fallback = cache.get<Match[]>(cacheKey, true);
      if (fallback) {
        console.log('[FALLBACK] Served cached matches after API failure');
        return res.json(fallback);
      }
      res.json([]);
    }
  });

  // API Route - Get standings (1 minute TTL cache - Ultra Plan)
  app.get('/api/standings', async (req, res) => {
    const apiKey = sanitizeApiKey(process.env.API_FOOTBALL_KEY);
    const leagueId = parseInt((req.query.league as string) || '1');
    const season = parseInt((req.query.season as string) || '2026');
    if (!apiKey) {
      return res.json({ response: [] });
    }

    try {
      const data = await fetchCached(`standings_${leagueId}_${season}`, () => fetchFromApiFootballRaw(`standings?league=${leagueId}&season=${season}`, apiKey), 60000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch standings', message: err.message });
    }
  });

  // API Route - Get player stats: topscorers, topassists, etc. (1 minute TTL cache - Ultra Plan)
  app.get('/api/players/:type', async (req, res) => {
    const type = req.params.type;
    const apiKey = sanitizeApiKey(process.env.API_FOOTBALL_KEY);
    const leagueId = parseInt((req.query.league as string) || '1');
    const season = parseInt((req.query.season as string) || '2026');
    if (!apiKey) {
      return res.json({ response: [] });
    }

    const permittedTypes = ['topscorers', 'topassists', 'topyellowcards', 'topredcards'];
    if (!permittedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid stats type' });
    }

    try {
      const data = await fetchCached(`players_${type}_${leagueId}_${season}`, () => fetchFromApiFootballRaw(`players/${type}?league=${leagueId}&season=${season}`, apiKey), 60000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: `Failed to fetch player stats: ${type}`, message: err.message });
    }
  });

  // API Route - Get injuries (1 minute TTL cache - Ultra Plan)
  app.get('/api/injuries', async (req, res) => {
    const apiKey = sanitizeApiKey(process.env.API_FOOTBALL_KEY);
    const leagueId = parseInt((req.query.league as string) || '1');
    const season = parseInt((req.query.season as string) || '2026');
    if (!apiKey) {
      return res.json({ response: [] });
    }

    try {
      const data = await fetchCached(`injuries_${leagueId}_${season}`, () => fetchFromApiFootballRaw(`injuries?league=${leagueId}&season=${season}`, apiKey), 60000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch injuries', message: err.message });
    }
  });

  // API Route - Get single match details
  app.get('/api/matches/:id', (req, res) => {
    const matchId = parseInt(req.params.id);
    const matches = cache.get<Match[]>('matches', true);
    const match = (matches || []).find(m => m.id === matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(match);
  });

  // API-Football Proxy Endpoint with generic memory-cached behavior
  app.get('/api/football/proxy', async (req, res) => {
    const apiEndpoint = req.query.url as string;
    const apiKey = sanitizeApiKey(process.env.API_FOOTBALL_KEY);

    if (!apiEndpoint) {
      return res.status(400).json({ error: 'Missing target URL query parameter.' });
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'No API Key found. Set API_FOOTBALL_KEY environment variable to enable live proxy requests.',
      });
    }

    try {
      const data = await fetchCached(`proxy_${apiEndpoint}`, () => fetchFromApiFootballRaw(apiEndpoint, apiKey), 60000);
      res.json(data);
    } catch (err: any) {
      console.error('[PROXY ERROR]', err);
      res.status(500).json({ error: 'Failed to fetch from API-Football.', message: err.message });
    }
  });

  // Vite middleware setup for Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serving Static build assets in Production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FIFA World Cup Score Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
