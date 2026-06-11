import { Match } from '../types';

export async function checkApiStatus() {
    try {
        const res = await fetch('/api/status');
        if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                return {
                    liveFootballApi: !!data.liveFootballApi
                };
            }
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
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
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
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
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
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
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
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
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
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
        }
    } catch (e) {
        console.error('Failed to fetch head-to-head from server API proxy:', e);
    }
    return { response: [] };
}
