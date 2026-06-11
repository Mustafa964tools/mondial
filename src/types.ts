/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Team {
  id: number;
  name: string; // English
  nameKu: string; // Kurdish
  logo: string; // Image URL/placeholder
  code: string;
}

export type MatchStatus = 'NS' | 'LIVE' | 'HT' | 'FT' | 'CANC' | 'PST' | 'TBD' | 'SUSP' | 'ABD';

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'card' | 'sub';
  detail: string; // e.g. "L. Messi (Pen)" or "K. Mbappé"
  assist?: string;
  teamId: number;
  playerIn?: string; // For substitutions
  playerOut?: string; // For substitutions
  cardType?: 'yellow' | 'red'; // For cards
}

export interface Player {
  id: number;
  name: string;
  number: number;
  position: 'G' | 'D' | 'M' | 'F'; // Goalkeeper, Defender, Midfielder, Forward
  gridX?: number; // For lineup visualization (1-5)
  gridY?: number; // For lineup visualization (1-5)
}

export interface Lineup {
  formation: string; // e.g. "4-3-3", "4-2-3-1"
  players: Player[];
}

export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnGoal: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
}

export interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  minute: number;
  date: string;
  time: string;
  round: string; // e.g. "Group A", "Round of 16", "Quarter-finals", "Semi-finals", "Final"
  roundKu: string; // Kurdish version
  events: MatchEvent[];
  timestamp?: number; // Added for Countdown Timer
  lineups?: {
    home: Lineup;
    away: Lineup;
  } | null;
  stats: MatchStats;
}
