import { Match, MatchStatus, Team } from '../types';
import { translateTextKu } from './translations';
// Some team translations and round translations
const KU_ROUND_TRANSLATIONS: Record<string, string> = {
  'Final': 'یاری کۆتایی',
  'Semi-finals': 'پێش کۆتایی',
  'Quarter-finals': 'چارەکی کۆتایی',
  'Round of 16': '١٦ی کۆتایی',
  'Group Stage': 'قۆناغی کۆمەڵەکان',
  'Group': 'کۆمەڵەی',
  'Regular Season': 'وەرزی ئاسایی',
};

function translateRoundKu(round: string): string {
  for (const [eng, ku] of Object.entries(KU_ROUND_TRANSLATIONS)) {
    if (round.toLowerCase().includes(eng.toLowerCase())) {
      return ku + ' ' + round.replace(new RegExp('.*' + eng + '.*', 'i'), '').trim();
    }
  }
  return round;
}

const isNetlifyMode = () => {
    return false;
};

export async function checkApiStatus() {
    try {
        const res = await fetch('/api/status');
        if (res.ok) {
            const data = await res.json();
            return {
                liveFootballApi: !!data.liveFootballApi
            };
        }
    } catch (e) {
        console.warn('Backend server /api/status is not available, falling back to offline mode:', e);
    }
    return {
        liveFootballApi: false
    };
}

export async function fetchMatches(leagueId: number, season: number): Promise<Match[]> {
    try {
        const response = await fetch(`/api/matches?league=${leagueId}&season=${season}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error('Failed to fetch matches from server API proxy:', e);
    }
    return [];
}

export async function fetchStandings(leagueId: number, season: number) {
    try {
        const response = await fetch(`/api/standings?league=${leagueId}&season=${season}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error('Failed to fetch standings from server API proxy:', e);
    }
    return { response: [] };
}

export async function fetchPlayerStats(type: string, leagueId: number, season: number) {
    try {
        const response = await fetch(`/api/players/${type}?league=${leagueId}&season=${season}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error('Failed to fetch player stats from server API proxy:', e);
    }
    return { response: [] };
}

export async function fetchInjuries(leagueId: number, season: number) {
    try {
        const response = await fetch(`/api/injuries?league=${leagueId}&season=${season}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error('Failed to fetch injuries from server API proxy:', e);
    }
    return { response: [] };
}

export async function fetchHeadToHead(h2h: string) {
    try {
        const response = await fetch(`/api/football/proxy?url=${encodeURIComponent(`fixtures/headtohead?h2h=${h2h}`)}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error('Failed to fetch head-to-head from server API proxy:', e);
    }
    return { response: [] };
}
