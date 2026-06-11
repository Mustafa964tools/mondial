/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Match, MatchStatus, Team } from './types';
import SoccerField from './components/SoccerField';
import StatsBar from './components/StatsBar';
import EventTimeline from './components/EventTimeline';
import { playGoalCheers } from './utils/audio';
import { translateTextKu, TEAM_TRANSLATIONS_KU } from './lib/translations';
import { checkApiStatus, fetchMatches, fetchStandings, fetchPlayerStats, fetchInjuries, fetchHeadToHead } from './lib/client-api';
import {
  Trophy,
  Volume2,
  VolumeX,
  Clock,
  Play,
  RotateCw,
  Search,
  CheckCircle,
  AlertCircle,
  Activity,
  User,
  Users,
  Grid,
  Sparkles
} from 'lucide-react';

const TeamLogo = ({ team, className }: { team: Team; className: string }) => {
  const isColor = team.logo && team.logo.startsWith('#');
  const isEmpty = !team.logo;
  if (isColor || isEmpty) {
    return (
      <span
        style={isColor ? { backgroundColor: team.logo } : { backgroundColor: '#3f3f46' }}
        className={`${className} border border-white/10 flex items-center justify-center text-white font-semibold shadow-md shrink-0 select-none overflow-hidden`}
        title={team.name}
      >
        <span className="text-[10px] md:text-xs font-mono font-bold">{team.code}</span>
      </span>
    );
  }
  return (
    <div className="relative shrink-0 select-none">
      <img
        src={team.logo || undefined}
        alt={team.nameKu}
        referrerPolicy="no-referrer"
        className={`${className} border border-white/10 shadow-md shrink-0 object-contain bg-white flex items-center justify-center p-0.5 rounded-full`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const sibling = e.currentTarget.nextElementSibling as HTMLElement;
          if (sibling) {
            sibling.style.display = 'flex';
          }
        }}
      />
      <span
        style={{ display: 'none' }}
        className={`${className} border border-white/10 flex items-center justify-center bg-zinc-800 text-[10px] font-bold text-white absolute inset-0 rounded-full`}
      >
        {team.code}
      </span>
    </div>
  );
};

const GROUP_NAMES_KU: Record<string, string> = {
  'Group A': 'کۆمەڵەی A',
  'Group B': 'کۆمەڵەی B',
  'Group C': 'کۆمەڵەی C',
  'Group D': 'کۆمەڵەی D',
  'Group E': 'کۆمەڵەی E',
  'Group F': 'کۆمەڵەی F',
  'Group G': 'کۆمەڵەی G',
  'Group H': 'کۆمەڵەی H',
  'Group I': 'کۆمەڵەی I',
  'Group J': 'کۆمەڵەی J',
  'Group K': 'کۆمەڵەی K',
  'Group L': 'کۆمەڵەی L',
  'ranking of third-placed teams': 'ریزبەندی باشترین سێیەمەکان',
  'Ranking of third-placed teams': 'ریزبەندی باشترین سێیەمەکان',
  'rangin of third-placed teams': 'ریزبەندی باشترین سێیەمەکان',
  'Rangin of third-placed teams': 'ریزبەندی باشترین سێیەمەکان',
};

const TEAM_FLAGS: Record<string, string> = {
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czechia': 'cz',
  'Canada': 'ca', 'Bosnia': 'ba', 'Qatar': 'qa', 'Switzerland': 'ch',
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  'USA': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Türkiye': 'tr', 'Turkey': 'tr',
  'Germany': 'de', 'Curaçao': 'cw', 'Curacao': 'cw', 'Ivory Coast': 'ci', 'Ecuador': 'ec',
  'Netherlands': 'nl', 'Japan': 'jp', 'Sweden': 'se', 'Tunisia': 'tn',
  'Belgium': 'be', 'Egypt': 'eg', 'Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cabo Verde': 'cv', 'Saudi Arabia': 'sa', 'Uruguay': 'uy',
  'France': 'fr', 'Senegal': 'sn', 'Iraq': 'iq', 'Norway': 'no',
  'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
  'Portugal': 'pt', 'DR Congo': 'cd', 'Uzbekistan': 'uz', 'Colombia': 'co',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa'
};


function translateTeamKu(name: string): string {
  if (!name) return '';
  return TEAM_TRANSLATIONS_KU[name] || translateTextKu(name);
}

interface TeamStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const formatedKurdishDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}/${month}/${day}`;
};

const MatchCountdown = ({ date, time, timestamp }: { date: string, time: string, timestamp?: number }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!date) return '';
      
      let matchDate: Date;
      if (timestamp) {
        matchDate = new Date(timestamp);
      } else {
        if (!time) return '';
        // Fallback for missing timestamp (clean up Kurdish text to parse successfully if possible)
        try {
          const cleanTime = time.replace('پ.ن', 'PM').replace('پ.پ', 'AM');
          matchDate = new Date(`${date} ${cleanTime}`);
          if (isNaN(matchDate.getTime())) {
            matchDate = new Date(`${date}T${time}:00`);
          }
        } catch {
          return '';
        }
      }

      if (isNaN(matchDate.getTime())) return '';

      const now = new Date();
      const diff = matchDate.getTime() - now.getTime();
      
      if (diff <= 0) return '';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      if (days > 0) {
        return `ماوە: ${days} رۆژ و ${hours} کاتژمێر`;
      }
      if (hours > 0) {
        return `ماوە: ${hours} کاتژمێر و ${minutes} خولەک`;
      }
      return `ماوە: ${minutes} خولەک`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);
    
    return () => clearInterval(interval);
  }, [date, time, timestamp]);

  return (
    <span className="inline-block mt-2.5 text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.3)] font-black text-sm bg-[#ffd700]/10 px-1.5 py-0.5 rounded-md border border-[#ffd700]/30 max-w-max mx-auto">
      {timeLeft}
    </span>
  );
};

const demoMatch: Match = {
  id: 999999,
  homeTeam: {
    id: 10101,
    name: 'Iraq',
    nameKu: 'عێراق',
    logo: 'https://flagcdn.com/w80/iq.png',
    code: 'IRQ'
  },
  awayTeam: {
    id: 10102,
    name: 'Spain',
    nameKu: 'ئیسپانیا',
    logo: 'https://flagcdn.com/w80/es.png',
    code: 'ESP'
  },
  homeScore: 2,
  awayScore: 1,
  status: 'LIVE',
  minute: 74,
  date: '2026-06-11',
  time: '19:00',
  round: 'Demo Match',
  roundKu: 'یاری تاقیکاری (نموونەیی)',
  events: [
    {
      id: 'ev1',
      minute: 14,
      type: 'card',
      detail: 'گاڤی',
      teamId: 10102,
      cardType: 'yellow'
    },
    {
      id: 'ev2',
      minute: 28,
      type: 'goal',
      detail: 'ئەیمەن حوسێن',
      assist: 'عەلی جاسم',
      teamId: 10101
    },
    {
      id: 'ev3',
      minute: 42,
      type: 'goal',
      detail: 'ئالڤارۆ مۆراتا',
      assist: 'لامین یامال',
      teamId: 10102
    },
    {
      id: 'ev4',
      minute: 60,
      type: 'sub',
      detail: 'گۆڕانکاری',
      playerIn: 'زێدان ئیقبال',
      playerOut: 'ئوسامە ڕەشید',
      teamId: 10101
    },
    {
      id: 'ev5',
      minute: 71,
      type: 'goal',
      detail: 'زێدان ئیقبال',
      assist: 'ئەیمەن حوسێن',
      teamId: 10101
    }
  ],
  stats: {
    possession: { home: 44, away: 56 },
    shots: { home: 9, away: 14 },
    shotsOnGoal: { home: 4, away: 6 },
    corners: { home: 3, away: 8 },
    fouls: { home: 12, away: 8 },
    yellowCards: { home: 2, away: 1 },
    redCards: { home: 0, away: 0 }
  },
  lineups: {
    home: {
      formation: '4-2-3-1',
      players: [
        { id: 1001, name: 'جەلال حەسەن', number: 1, position: 'G', gridX: 3, gridY: 1 },
        { id: 1002, name: 'حوسێن عەلی', number: 3, position: 'D', gridX: 1, gridY: 2 },
        { id: 1003, name: 'ڕێبین سۆلاقا', number: 4, position: 'D', gridX: 2, gridY: 2 },
        { id: 1004, name: 'سەعد ناتیق', number: 2, position: 'D', gridX: 4, gridY: 2 },
        { id: 1005, name: 'میرخاس دۆسکی', number: 15, position: 'D', gridX: 5, gridY: 2 },
        { id: 1006, name: 'ئەمیر عەماری', number: 16, position: 'M', gridX: 2, gridY: 3 },
        { id: 1007, name: 'ئوسامە ڕەشید', number: 8, position: 'M', gridX: 4, gridY: 3 },
        { id: 1008, name: 'ئیبراهیم بایش', number: 11, position: 'M', gridX: 1, gridY: 4 },
        { id: 1009, name: 'زێدان ئیقبال', number: 10, position: 'M', gridX: 3, gridY: 4 },
        { id: 1010, name: 'عەلی جاسم', number: 7, position: 'M', gridX: 5, gridY: 4 },
        { id: 1011, name: 'ئەیمەن حوسێن', number: 18, position: 'F', gridX: 3, gridY: 5 }
      ]
    },
    away: {
      formation: '4-3-3',
      players: [
        { id: 2001, name: 'ئۆنای سیمۆن', number: 1, position: 'G', gridX: 3, gridY: 1 },
        { id: 2002, name: 'کارڤاخال', number: 2, position: 'D', gridX: 1, gridY: 2 },
        { id: 2003, name: 'لێ نۆرماند', number: 3, position: 'D', gridX: 2, gridY: 2 },
        { id: 2004, name: 'لاپۆرتی', number: 14, position: 'D', gridX: 4, gridY: 2 },
        { id: 2005, name: 'کوکورێلا', number: 24, position: 'D', gridX: 5, gridY: 2 },
        { id: 2006, name: 'ڕۆدری', number: 16, position: 'M', gridX: 3, gridY: 3 },
        { id: 2007, name: 'پێدری', number: 20, position: 'M', gridX: 2, gridY: 4 },
        { id: 2008, name: 'فابیان ڕۆیز', number: 8, position: 'M', gridX: 4, gridY: 4 },
        { id: 2009, name: 'لامین یامال', number: 19, position: 'F', gridX: 1, gridY: 5 },
        { id: 2010, name: 'ئالڤارۆ مۆراتا', number: 7, position: 'F', gridX: 3, gridY: 5 },
        { id: 2011, name: 'نیکۆ ویلیامز', number: 17, position: 'F', gridX: 5, gridY: 5 }
      ]
    }
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

function AppContent() {
  const [activeNavTab, setActiveNavTab] = useState<'matches' | 'standings' | 'scorers' | 'injuries'>('matches');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'events' | 'stats' | 'lineups' | 'h2h'>('events');
  const [filterStage, setFilterStage] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [goalOverlay, setGoalOverlay] = useState<{
    show: boolean;
    teamNameKu: string;
    scorer: string;
    score: string;
  } | null>(null);

  const [realPlayerStatsType, setRealPlayerStatsType] = useState<'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards'>('topscorers');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const prevMatchesRef = useRef<Match[]>([]);
  const selectedMatchRef = useRef<Match | null>(null);

  useEffect(() => {
    selectedMatchRef.current = selectedMatch;
  }, [selectedMatch]);

  // 1. API Status Query (checks configuration status)
  const apiStatusQuery = useQuery({
    queryKey: ['apiStatus'],
    queryFn: async () => {
      return checkApiStatus();
    },
    staleTime: 300000, // 5 minutes
  });

  const isLiveApiActive = apiStatusQuery.data?.liveFootballApi || false;

  // 2. Main Match Data Query (with dynamic auto-polling TTL matching matches status)
  const matchesQuery = useQuery({
    queryKey: ['matches', 1],
    queryFn: async () => {
      return fetchMatches(1, 2026);
    },
    refetchInterval: (query) => {
      const list = query.state.data || [];
      const hasLive = list.some((m: Match) => m.status === 'LIVE' || m.status === 'HT');
      // Dynamic TTL - Ultra Plan: 15 seconds if there are LIVE matches, 3 minutes otherwise
      return hasLive ? 15000 : 180000;
    },
    staleTime: 15000,
  });

  const rawMatches = matchesQuery.data || [];
  const matches = useMemo(() => {
    return isDemoActive ? [demoMatch, ...rawMatches] : rawMatches;
  }, [isDemoActive, rawMatches]);
  const isLoading = matchesQuery.isLoading;

  // Sound triggers, real-time sync for active match selection, manual clock updating
  useEffect(() => {
    if (matches.length > 0) {
      if (prevMatchesRef.current.length > 0) {
        matches.forEach((newMatch) => {
          const oldMatch = prevMatchesRef.current.find((m) => m.id === newMatch.id);
          if (oldMatch && oldMatch.status === 'LIVE') {
            if (newMatch.homeScore > oldMatch.homeScore) {
              triggerGoalAlert(newMatch, newMatch.homeTeam);
            } else if (newMatch.awayScore > oldMatch.awayScore) {
              triggerGoalAlert(newMatch, newMatch.awayTeam);
            }
          }
        });
      }
      prevMatchesRef.current = matches;

      // Sync selection
      if (selectedMatch) {
         const syncedSelected = matches.find((m) => m.id === selectedMatch.id);
         if (syncedSelected) {
           setSelectedMatch(syncedSelected);
         }
      }

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('ku-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [matches]);

  // 3. Standings Query
  const standingsQuery = useQuery({
    queryKey: ['standings', isLiveApiActive, 1],
    queryFn: async () => {
      const data = await fetchStandings(1, 2026);
      return data.response?.[0]?.league?.standings || [];
    },
    enabled: isLiveApiActive,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000
  });

  const realStandings = standingsQuery.data || [];
  const isRealStandingsLoading = standingsQuery.isLoading;

  // 4. Player Statistics Query (automatically re-fetches when type tab changes in the panel)
  const playerStatsQuery = useQuery({
    queryKey: ['playerStats', realPlayerStatsType, isLiveApiActive, 1],
    queryFn: async () => {
      const data = await fetchPlayerStats(realPlayerStatsType, 1, 2026);
      return data.response || [];
    },
    enabled: isLiveApiActive,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000
  });

  const realPlayerStats = playerStatsQuery.data || [];
  const isRealPlayerStatsLoading = playerStatsQuery.isLoading;

  // 5. Injuries & Suspensions Query
  const injuriesQuery = useQuery({
    queryKey: ['injuries', isLiveApiActive, 1],
    queryFn: async () => {
      const data = await fetchInjuries(1, 2026);
      return data.response || [];
    },
    enabled: isLiveApiActive,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000
  });

  const realInjuries = injuriesQuery.data || [];
  const isRealInjuriesLoading = injuriesQuery.isLoading;

  // 5. Head-to-Head Query
  const h2hQuery = useQuery({
    queryKey: ['h2h', selectedMatch?.homeTeam.id, selectedMatch?.awayTeam.id, isLiveApiActive, 1],
    queryFn: async () => {
      if (!selectedMatch || !isLiveApiActive) return null;
      const data = await fetchHeadToHead(`${selectedMatch.homeTeam.id}-${selectedMatch.awayTeam.id}`);
      return data.response || [];
    },
    enabled: !!selectedMatch && activeDetailsTab === 'h2h' && isLiveApiActive,
  });
  const h2hMatches = (h2hQuery.data || []).filter((h2hMatch: any) => {
    // تەنیا یارییە کۆنەکان کە ئەنجام دراون و پێنجەم مۆندیالی ئێستا نین تێدابێت
    const isPlayed = h2hMatch.goals && h2hMatch.goals.home !== null && h2hMatch.goals.away !== null;
    const isNotCurrent = h2hMatch.fixture && h2hMatch.fixture.id !== selectedMatch?.id;
    return isPlayed && isNotCurrent;
  });

  const isSelectedDetailsLoading = h2hQuery.isLoading;

  // Dynamic top scorers list calculation
  const scorersList = (() => {
    const scorerMap: Record<string, { player: string; goals: number; team: Team }> = {};
    matches.forEach(m => {
      m.events.forEach(e => {
        if (e.type === 'goal') {
          let cleanName = e.detail;
          if (cleanName.includes('(Pen)')) cleanName = cleanName.replace('(Pen)', '');
          if (cleanName.includes(' (Pen)')) cleanName = cleanName.replace(' (Pen)', '');
          if (cleanName.includes('(p)')) cleanName = cleanName.replace('(p)', '');
          if (cleanName.includes('(P)')) cleanName = cleanName.replace('(P)', '');
          cleanName = cleanName.trim();

          const eventTeam = e.teamId === m.homeTeam.id ? m.homeTeam : m.awayTeam;

          if (!scorerMap[cleanName]) {
            scorerMap[cleanName] = {
              player: cleanName,
              goals: 0,
              team: eventTeam
            };
          }
          scorerMap[cleanName].goals += 1;
        }
      });
    });

    return Object.values(scorerMap).sort((a, b) => b.goals - a.goals);
  })();

  // Dynamic Group Standings calculation
  const standingsGroups = (() => {
    const standingsMap: Record<string, Record<number, TeamStanding>> = {};

    const officialGroupTeams = {
      'Group A': ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
      'Group B': ['Canada', 'Bosnia', 'Qatar', 'Switzerland'],
      'Group C': ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
      'Group D': ['USA', 'Paraguay', 'Australia', 'Türkiye'],
      'Group E': ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
      'Group F': ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
      'Group G': ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
      'Group H': ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
      'Group I': ['France', 'Senegal', 'Iraq', 'Norway'],
      'Group J': ['Argentina', 'Algeria', 'Austria', 'Jordan'],
      'Group K': ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
      'Group L': ['England', 'Croatia', 'Ghana', 'Panama']
    };

    const teamGroupMap: Record<number, string> = {};
    const teamRecord: Record<number, Team> = {};

    // 1. Discover all unique teams from matches
    matches.forEach(m => {
      teamRecord[m.homeTeam.id] = m.homeTeam;
      teamRecord[m.awayTeam.id] = m.awayTeam;
    });

    const unifyName = (n: string) => {
      let un = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, '');
      if (un === 'usa') return 'unitedstates';
      if (un === 'southkorea') return 'korearepublic';
      if (un === 'bosnia') return 'bosniaandherzegovina';
      if (un === 'turkiye') return 'turkey';
      return un;
    };

    const realTeamValues = Object.values(teamRecord);

    const findTeamByName = (name: string) => {
       const un = unifyName(name);
       return realTeamValues.find(t => unifyName(t.name) === un || unifyName(t.name) === un.replace('republic', ''));
    };

    let fakeIdCounter = -1;

    Object.entries(officialGroupTeams).forEach(([gName, teamNames]) => {
      standingsMap[gName] = {};
      teamNames.forEach(name => {
        const realTeam = findTeamByName(name);
        
        if (realTeam) {
           teamGroupMap[realTeam.id] = gName;
           standingsMap[gName][realTeam.id] = {
             team: realTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
           };
        } else {
           const id = fakeIdCounter--;
           const kuName = TEAM_TRANSLATIONS_KU[name] || translateTextKu(name);
           const flagCode = TEAM_FLAGS[name];
           const logoUrl = flagCode ? `https://flagcdn.com/w40/${flagCode}.png` : '';
           const t: Team = {
              id, name, nameKu: kuName, logo: logoUrl, code: name.substring(0, 3).toUpperCase()
           };
           teamGroupMap[id] = gName;
           teamRecord[id] = t;
           standingsMap[gName][id] = {
             team: t, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
           };
        }
      });
    });

    // Fallback: If there are teams in matches that didn't match the list, try to add them to their match group
    matches.forEach(m => {
      const isGroupMatch = m.round.toLowerCase().includes('group') || m.roundKu.includes('کۆمەڵە');
      if (isGroupMatch) {
         let groupName = 'Group A';
         const matchStr = m.round.match(/Group [A-L]/i);
         if (matchStr) {
           groupName = matchStr[0].toUpperCase();
         }
         
         const addIfMissing = (team: Team) => {
            if (!teamGroupMap[team.id]) {
                teamGroupMap[team.id] = groupName;
                if (!standingsMap[groupName]) standingsMap[groupName] = {};
                standingsMap[groupName][team.id] = {
                    team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
                };
            }
         };
         
         addIfMissing(m.homeTeam);
         addIfMissing(m.awayTeam);
      }
    });

    // Loop through matches and process finished/live ones
    matches.forEach(m => {
      const isGroupMatch = m.round.toLowerCase().includes('group') || m.roundKu.includes('کۆمەڵە');
      if (!isGroupMatch || m.status === 'NS') return;

      const gHome = teamGroupMap[m.homeTeam.id];
      const gAway = teamGroupMap[m.awayTeam.id];

      // Only process if they actually belong to a known group
      if (!gHome || !gAway) return;

      const homeSt = standingsMap[gHome][m.homeTeam.id];
      const awaySt = standingsMap[gAway][m.awayTeam.id];

      homeSt.played += 1;
      awaySt.played += 1;
      homeSt.goalsFor += m.homeScore;
      homeSt.goalsAgainst += m.awayScore;
      awaySt.goalsFor += m.awayScore;
      awaySt.goalsAgainst += m.homeScore;

      if (m.homeScore > m.awayScore) {
        homeSt.won += 1;
        homeSt.points += 3;
        awaySt.lost += 1;
      } else if (m.homeScore < m.awayScore) {
        awaySt.won += 1;
        awaySt.points += 3;
        homeSt.lost += 1;
      } else {
        homeSt.drawn += 1;
        homeSt.points += 1;
        awaySt.drawn += 1;
        awaySt.points += 1;
      }

      homeSt.goalDifference = homeSt.goalsFor - homeSt.goalsAgainst;
      awaySt.goalDifference = awaySt.goalsFor - awaySt.goalsAgainst;
    });

    const sortedGroups: Record<string, TeamStanding[]> = {};
    Object.keys(standingsMap).forEach(gName => {
      sortedGroups[gName] = Object.values(standingsMap[gName]).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
    });

    return sortedGroups;
  })();

  // Sound and overlay trigger helper when a live score changes
  const triggerGoalAlert = (match: Match, scoringTeam: Team) => {
    // 1. Play synthesized roar
    if (isAudioEnabled) {
      playGoalCheers();
    }

    // 2. Identify the most recent goal scorer from events
    const scoresBefore = match.events.filter(e => e.type === 'goal');
    const lastScorer = scoresBefore[scoresBefore.length - 1]?.detail || 'گۆڵێکی نایاب!';

    // 3. Display glowing Goal Celebration Overlay Toast
    setGoalOverlay({
      show: true,
      teamNameKu: scoringTeam.nameKu,
      scorer: lastScorer,
      score: `${match.awayScore} - ${match.homeScore}`,
    });

    // Auto-dim overlay after 7 seconds
    setTimeout(() => {
      setGoalOverlay(null);
    }, 7000);
  };



  // Clean filters computation
  let filteredMatches = matches.filter((match) => {
    if (filterStage === 'live') return match.status === 'LIVE' || match.status === 'HT';
    if (filterStage === 'finished') return match.status === 'FT';
    if (filterStage === 'upcoming') {
      if (match.status !== 'NS' && match.status !== 'TBD') return false;
      const matchTime = match.timestamp || new Date(match.date).getTime();
      const now = Date.now();
      // Keep matches that are in the future or no more than 24 hours in the past
      return matchTime > now - (24 * 60 * 60 * 1000);
    }
    return true; // All Matches
  });

  // Sort logically based on filter
  filteredMatches.sort((a, b) => {
    const timeA = a.timestamp || new Date(a.date).getTime() || 0;
    const timeB = b.timestamp || new Date(b.date).getTime() || 0;
    
    if (filterStage === 'finished') {
      // Newest finished matches first
      return timeB - timeA;
    } else if (filterStage === 'upcoming') {
      // Closest upcoming matches first
      return timeA - timeB;
    }
    // For live or all, just keep closest to now first or chronological
    return timeA - timeB;
  });

  // Kurdish Match status translation helpers
  const isUnplayed = (status: MatchStatus) => {
    return ['NS', 'CANC', 'PST', 'TBD', 'SUSP', 'ABD'].includes(status);
  };

  const getStatusBadge = (status: MatchStatus, minute: number) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-400 border border-rose-900/40">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            راستەوخۆ {minute}'
          </span>
        );
      case 'HT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-950 text-yellow-400 border border-yellow-900/40">
            نێوان گێمەکان (HT)
          </span>
        );
      case 'FT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900/40">
            تەواوبوو (FT)
          </span>
        );
      case 'NS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
            دەستی پێنەکردووە
          </span>
        );
      case 'CANC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-900/40">
            هەڵوەشاوەتەوە (CANC)
          </span>
        );
      case 'PST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-950 text-orange-400 border border-orange-900/40">
            دواخراوە (PST)
          </span>
        );
      case 'TBD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
            دیارینەکراوە
          </span>
        );
      case 'SUSP':
      case 'ABD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-900/40">
            راگیراوە
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="application-root" className="h-[100dvh] w-full bg-[#030406] text-slate-100 font-sans overflow-hidden flex flex-col selection:bg-gold-bright/35 select-none relative">
      
      {/* 1. Header Navigation Bar (Mobile Optimized Header) */}
      <header className="h-16 border-b border-white/5 bg-gradient-to-r from-[#0a0c10] via-[#0f141e] to-[#0a0c10] flex items-center justify-between px-4 flex-shrink-0 z-30 sticky top-0 shadow-2xl">
        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <div className="flex items-center gap-2 bg-[#05070a] border border-white/10 px-3 py-1.5 rounded-xl shadow-inner">
            <span className={`w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-black/50 ${isLiveApiActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-600 animate-pulse'}`} />
            <span className="text-[10px] font-mono text-white/60 font-black uppercase hidden sm:inline tracking-wider">
              {isLiveApiActive ? 'LIVE' : 'WAIT'}
            </span>
          </div>

          {/* Manual Refresher */}
          <button
            id="manual-refresh-matches"
            onClick={() => {
              queryClient.invalidateQueries();
            }}
            className="p-2.5 bg-gradient-to-br from-[#121826] to-[#0a0e16] border border-white/10 hover:border-[#ffd700]/60 text-[#ffd700] rounded-xl hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop-only top navigation tabs (Hidden on mobile) */}
        <nav className="hidden lg:flex gap-8 text-sm font-black uppercase tracking-widest">
          <button
            onClick={() => setActiveNavTab('matches')}
            className={`pb-1 cursor-pointer transition-all ${
              activeNavTab === 'matches'
                ? 'text-[#ffd700] border-b-2 border-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            یارییەکان
          </button>
          <button
            onClick={() => setActiveNavTab('standings')}
            className={`pb-1 cursor-pointer transition-all ${
              activeNavTab === 'standings'
                ? 'text-[#ffd700] border-b-2 border-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            خشتەی کۆمەڵەکان
          </button>
          <button
            onClick={() => setActiveNavTab('scorers')}
            className={`pb-1 cursor-pointer transition-all ${
              activeNavTab === 'scorers'
                ? 'text-[#ffd700] border-b-2 border-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            ئاماری یاریزانان
          </button>
          <button
            onClick={() => setActiveNavTab('injuries')}
            className={`pb-1 cursor-pointer transition-all ${
              activeNavTab === 'injuries'
                ? 'text-[#ffd700] border-b-2 border-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            پێکانەکان
          </button>
        </nav>

        <div className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="964 Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
        </div>
      </header>

      {/* 2. Main Content Layout (Sidebar + Hero Area) */}
      <main className="flex flex-col lg:flex-row flex-1 overflow-hidden w-full relative min-h-0">
        {activeNavTab === 'matches' ? (
          <>
            {/* Left Side: Match List Sidebar (Full width on mobile, stylish) */}
            <aside className={`w-full lg:w-[400px] lg:flex-none flex-1 min-h-0 h-full lg:border-e border-white/5 bg-[#05070a] flex flex-col shrink-0 overflow-hidden ${
              selectedMatch ? 'hidden lg:flex' : 'flex'
            }`}>
          
          {/* Header Row */}
          <div className="p-5 border-b border-white/5 bg-gradient-to-b from-[#0a0e1a]/80 to-transparent flex justify-between items-center shrink-0 shadow-sm z-10">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
              <span className="text-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">⚽</span> خشتەی یارییەکان
            </h2>
            <button
              onClick={() => {
                setIsDemoActive(prev => {
                  const nextVal = !prev;
                  if (nextVal) {
                    setSelectedMatch(demoMatch);
                  } else if (selectedMatch?.id === 999999) {
                    setSelectedMatch(null);
                  }
                  return nextVal;
                });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 border ${
                isDemoActive 
                  ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] border-[#ffd700]/70 text-black shadow-[0_4px_15px_rgba(255,215,0,0.35)]' 
                  : 'bg-gradient-to-br from-[#121826] to-[#0a0e16] border-white/10 hover:border-[#ffd700]/60 text-white/70 hover:text-white'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isDemoActive ? 'text-black' : 'text-[#ffd700]'}`} />
              <span>{isDemoActive ? 'دێمۆ چالاکە' : 'یاری دێمۆ'}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="p-3 bg-[#0a0c10] border-b border-white/5 shrink-0 flex gap-2 overflow-x-auto scrollbar-none shadow-inner">
            <button
              id="filter-all"
              onClick={() => setFilterStage('all')}
              className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                filterStage === 'all'
                  ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)] border border-[#ffd700]'
                  : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
              }`}
            >
              کۆی یارییەکان
            </button>
            <button
              id="filter-live"
              onClick={() => setFilterStage('live')}
              className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                filterStage === 'live'
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)] border border-red-500'
                  : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_5px_rgba(248,113,113,0.8)]" />
              راستەوخۆ
            </button>
            <button
              id="filter-upcoming"
              onClick={() => setFilterStage('upcoming')}
              className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                filterStage === 'upcoming'
                  ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)] border border-[#ffd700]'
                  : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
              }`}
            >
              یارییەکانی داهاتوو
            </button>
            <button
              id="filter-finished"
              onClick={() => setFilterStage('finished')}
              className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                filterStage === 'finished'
                  ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)] border border-[#ffd700]'
                  : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
              }`}
            >
              یارییە ئەنجامدراوەکان
            </button>
          </div>

          {/* Scrollable list content */}
          <div className="flex-1 overflow-y-auto bg-[#030406] px-4 py-4 space-y-4 pb-24 lg:pb-4">
            {isLoading && matches.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/40 text-sm font-bold">چاوەڕێ بکە... خشتەکە نوێ دەبێتەوە</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="p-12 text-center text-white/30">
                <AlertCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-sm font-bold">
                  {!isLiveApiActive ? 'کلیلی API دانەنراوە' : 'هیچ یارییەک بۆ ئەم پۆلێنە نییە.'}
                </p>
                {!isLiveApiActive && (
                  <p className="text-xs text-white/40 mt-2 leading-relaxed">
                    تکایە کلیلی API دابنێ بۆ بینینی یارییە راستەقینەکان.
                  </p>
                )}
              </div>
            ) : (
              filteredMatches.map((match) => {
                const isSelected = selectedMatch?.id === match.id;
                return (
                  <div
                    key={match.id}
                    id={`match-card-${match.id}`}
                    onClick={() => setSelectedMatch(match)}
                    className={`relative p-5 rounded-2xl transition-all cursor-pointer shadow-lg overflow-hidden border ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#1a1c23] to-[#0a0e1a] border-[#ffd700]/70 shadow-[0_8px_30px_rgba(255,215,0,0.15)] ring-1 ring-[#ffd700]/30 transform scale-[1.02]'
                        : 'bg-[#0f141e] border-white/5 hover:border-white/20 hover:bg-[#161c28]'
                    }`}
                  >
                    {/* Decorative glow for selected */}
                    {isSelected && <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffd700] opacity-5 blur-[50px] pointer-events-none rounded-full" />}
                    
                    <div className="flex justify-between items-center mb-4 z-10 relative">
                      <span className="text-xs font-black text-white/60 tracking-wider">
                        🏆 {match.roundKu}
                      </span>
                      <span>{getStatusBadge(match.status, match.minute)}</span>
                    </div>

                    <div className="flex items-center justify-between z-10 relative">
                      {/* Home Team */}
                      <div className="flex flex-col items-center gap-2 w-[32%] shrink-0 text-center">
                        <TeamLogo team={match.homeTeam} className={`w-12 h-12 rounded-full shadow-md ${isSelected ? 'ring-2 ring-white/10' : ''}`} />
                        <span className="text-xs sm:text-sm font-bold text-white whitespace-normal text-center leading-tight break-words">{match.homeTeam.nameKu}</span>
                      </div>

                      {/* Display score */}
                      <div className="text-center flex-1 flex flex-col items-center justify-centerpx-1">
                        <div dir="ltr" className={`text-3xl font-black font-display tracking-tighter drop-shadow-md ${match.status === 'LIVE' ? 'text-red-500' : isSelected ? 'text-[#ffd700]' : 'text-white'}`}>
                          {isUnplayed(match.status) ? 'VS' : `${match.awayScore} - ${match.homeScore}`}
                        </div>
                        {isUnplayed(match.status) && (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-white/40 font-mono block mt-1 tracking-widest font-black bg-black/30 px-2 py-0.5 rounded-full border border-white/5">{formatedKurdishDate(match.date)} • {match.time}</span>
                            {match.status === 'NS' && <MatchCountdown date={match.date} time={match.time} timestamp={match.timestamp} />}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-col items-center gap-2 w-[32%] shrink-0 text-center">
                        <TeamLogo team={match.awayTeam} className={`w-12 h-12 rounded-full shadow-md ${isSelected ? 'ring-2 ring-white/10' : ''}`} />
                        <span className="text-xs sm:text-sm font-bold text-white whitespace-normal text-center leading-tight break-words">{match.awayTeam.nameKu}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side: Main Detail Area */}
        <section className={`flex-1 bg-gradient-to-b from-[#030406] to-[#0a0c10] relative flex flex-col overflow-y-auto ${
          selectedMatch ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {selectedMatch ? (
            <div id="selected-match-center" className="flex flex-col flex-1 min-h-full pb-24 lg:pb-0">
              
              {/* Premium Mobile Back Header Bar */}
              <div className="lg:hidden px-4 py-3 bg-[#0a0c10]/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-40 shadow-md">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/80 hover:text-white border border-white/10 text-xs font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  <span className="text-lg font-bold">←</span> خشتەی یارییەکان
                </button>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-[#ffd700] tracking-widest uppercase font-mono shadow-sm">
                  <span>WORLD CUP 2026</span>
                </div>
              </div>
              
              {/* Scoreboard Immersive Hero Area with elegant radial gradients */}
              <div dir="rtl" className="py-8 md:py-12 bg-gradient-to-b from-[#121826] to-[#0a0c10] border-b border-white/5 relative overflow-hidden">
                
                {/* Decorative background aura overlay */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#ffd700] opacity-5 blur-[80px] pointer-events-none rounded-full" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-600 opacity-5 blur-[60px] pointer-events-none rounded-full" />

                <div className="flex justify-center items-center px-4 relative z-10 w-full max-w-2xl mx-auto">
                  {/* Home Team */}
                  <div className="flex-1 flex flex-col items-center justify-start h-full pt-2">
                    <div className="relative">
                      <TeamLogo team={selectedMatch.homeTeam} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] mb-3 sm:mb-4 bg-[#0a0c10] border-[3px] border-[#1a2333]" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-medium text-white text-center px-1">
                      {selectedMatch.homeTeam.nameKu}
                    </h3>
                  </div>

                  {/* Status & Goals */}
                  <div className="flex flex-col items-center justify-start h-full shrink-0 min-w-[140px]">
                    <div className="mb-2 sm:mb-3">
                      {selectedMatch.status === 'LIVE' ? (
                         <div className="bg-[#ff4040] text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(255,64,64,0.3)] flex items-center gap-1 font-sans tracking-wide">
                           {selectedMatch.minute}'
                         </div>
                      ) : isUnplayed(selectedMatch.status) ? (
                         <div className="bg-white/10 text-white/80 px-4 py-1 rounded-full text-xs sm:text-sm font-bold font-mono border border-white/5 shadow-inner">
                           {selectedMatch.time}
                         </div>
                      ) : (
                         <div dir="rtl" className="bg-white/10 text-white/80 px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold font-sans">
                           کۆتایی
                         </div>
                      )}
                    </div>
                    <div className={`text-[46px] leading-none md:text-[64px] font-bold tracking-tight font-sans drop-shadow-md mt-1 ${selectedMatch.status === 'LIVE' ? 'text-white' : 'text-white'}`}>
                      {isUnplayed(selectedMatch.status) ? 'VS' : (
                         <div className="flex items-center justify-center gap-3 md:gap-4">
                            <span>{selectedMatch.homeScore}</span>
                            <span className="text-white/30 text-3xl md:text-4xl font-light -mt-2">-</span>
                            <span>{selectedMatch.awayScore}</span>
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex flex-col items-center justify-start h-full pt-2">
                    <div className="relative">
                      <TeamLogo team={selectedMatch.awayTeam} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] mb-3 sm:mb-4 bg-[#0a0c10] border-[3px] border-[#1a2333]" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-medium text-white text-center px-1">
                      {selectedMatch.awayTeam.nameKu}
                    </h3>
                  </div>
                </div>

                {isUnplayed(selectedMatch.status) && (
                  <div className="text-center mt-6 relative z-10 w-full flex justify-center">
                    <div className="flex flex-col items-center gap-2">
                       <p className="text-[10px] sm:text-xs text-white/50 font-black drop-shadow-sm font-sans tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5">
                         {formatedKurdishDate(selectedMatch.date)} • {selectedMatch.time}
                       </p>
                       {selectedMatch.status === 'NS' && <MatchCountdown date={selectedMatch.date} time={selectedMatch.time} timestamp={selectedMatch.timestamp} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Navigation Tabs */}
              <div className="px-4 md:px-8 py-3 border-b border-white/5 bg-[#0a0c10] flex gap-2 overflow-x-auto whitespace-nowrap shrink-0 z-10 sticky top-[60px] lg:top-0 scrollbar-none scroll-smooth shadow-inner">
                <button
                  id="tab-events"
                  onClick={() => setActiveDetailsTab('events')}
                  className={`py-2 mx-1 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeDetailsTab === 'events'
                      ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)]'
                      : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
                  }`}
                >
                  رووداوەکان
                </button>
                <button
                  id="tab-stats"
                  onClick={() => setActiveDetailsTab('stats')}
                  className={`py-2 mx-1 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeDetailsTab === 'stats'
                      ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)]'
                      : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
                  }`}
                >
                  ئامارەکان
                </button>
                <button
                  id="tab-lineups"
                  onClick={() => setActiveDetailsTab('lineups')}
                  className={`py-2 mx-1 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeDetailsTab === 'lineups'
                      ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)]'
                      : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
                  }`}
                >
                  پێکهاتە
                </button>
                <button
                  id="tab-h2h"
                  onClick={() => setActiveDetailsTab('h2h')}
                  className={`py-2 mx-1 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeDetailsTab === 'h2h'
                      ? 'bg-gradient-to-r from-[#ffd700] to-[#b8860b] text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)]'
                      : 'bg-[#121826] text-white/50 border border-white/5 hover:text-white hover:bg-[#1a2333]'
                  }`}
                >
                  رووبەڕووبوونەوە
                </button>
              </div>

              {/* Tab Display Area */}
              <div className="flex-1 p-6 md:p-8 bg-gradient-to-b from-transparent to-black/10 overflow-y-auto">
                {activeDetailsTab === 'events' && (
                  isUnplayed(selectedMatch.status) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60 font-sans">
                      <div className="text-3xl mb-4">⏱️</div>
                      <h3 className="text-lg font-bold text-white mb-2">یارییەکە هێشتا دەستی پێ نەکردووە</h3>
                      <p className="text-sm text-white/60 max-w-md leading-relaxed">لە کاتی دەستپێکردنی یارییەکەدا، رووداوەکانی وەک گۆڵ، کارت و گۆڕانکارییەکان لێرەدا دەردەکەون.</p>
                    </div>
                  ) : selectedMatch.events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60 font-sans">
                      <div className="text-3xl mb-4">⚽</div>
                      <h3 className="text-lg font-bold text-white mb-2">هیچ رووداوێک لەم یارییەدا نییە</h3>
                      <p className="text-sm text-white/60 max-w-md leading-relaxed">تا ئێستا هیچ گۆڵ، کارت و گۆڕانکارییەک لەم یارییەدا تۆمار نەکراوە.</p>
                    </div>
                  ) : (
                    <EventTimeline
                      events={selectedMatch.events}
                      homeTeam={selectedMatch.homeTeam}
                      awayTeam={selectedMatch.awayTeam}
                    />
                  )
                )}
                {activeDetailsTab === 'stats' && (
                  isUnplayed(selectedMatch.status) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                      <div className="text-3xl mb-4">📊</div>
                      <h3 className="text-lg font-bold text-white mb-2">یارییەکە هێشتا دەستی پێ نەکردووە</h3>
                      <p className="text-sm text-white/60 max-w-md">ئامارەکانی یارییەکە دوای دەستپێکردنی راستەوخۆ لێرە دەردەکەون.</p>
                    </div>
                  ) : (
                    <StatsBar
                      stats={selectedMatch.stats}
                      homeColor={selectedMatch.homeTeam.logo.startsWith('#') ? selectedMatch.homeTeam.logo : '#3155b4'}
                      awayColor={selectedMatch.awayTeam.logo.startsWith('#') ? selectedMatch.awayTeam.logo : '#f44336'}
                    />
                  )
                )}
                {activeDetailsTab === 'lineups' && (
                  <SoccerField
                    homeTeamName={selectedMatch.homeTeam.name}
                    awayTeamName={selectedMatch.awayTeam.name}
                    homeTeamKu={selectedMatch.homeTeam.nameKu}
                    awayTeamKu={selectedMatch.awayTeam.nameKu}
                    lineups={selectedMatch.lineups}
                  />
                )}
                {activeDetailsTab === 'h2h' && (
                  <div className="space-y-4">
                    <h3 className="text-white/80 font-bold mb-4 flex items-center gap-2">
                      <span className="text-xl">⚔️</span> رووبەڕووبوونەوەکانی پێشوو
                    </h3>
                    {h2hQuery.isLoading ? (
                      <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-[#ffd700] border-t-transparent animate-spin"></div></div>
                    ) : (!h2hMatches || h2hMatches.length === 0) ? (
                      <div className="bg-[#121826] border border-white/5 p-8 rounded-2xl text-center">
                        <p className="text-white/60">هیچ رووبەڕووبوونەوەیەکی پێشوو لە نێوان ئەم دوو هەڵبژاردەیەدا نەدۆزرایەوە.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {h2hMatches.slice(0, 10).map((h2hMatch: any) => (
                          <div key={h2hMatch.fixture.id} className="bg-[#121826] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-center md:text-right text-xs text-white/50 w-full md:w-32">
                              <div>{new Date(h2hMatch.fixture.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                              <div className="truncate opacity-50 mt-1">{h2hMatch.league.name}</div>
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-4 text-sm md:text-base font-bold bg-[#0a0c10] py-2 px-6 rounded-lg w-full md:w-auto">
                              <span className={`flex-1 text-right text-xs sm:text-sm whitespace-normal leading-tight ${h2hMatch.teams.home.winner ? 'text-[#ffd700]' : 'text-white'}`}>{translateTeamKu(h2hMatch.teams.home.name)}</span>
                              <span dir="ltr" className="bg-white/10 px-3 py-1 rounded-md text-white tabular-nums tracking-widest min-w-[50px] text-center shrink-0">
                                {h2hMatch.goals.away ?? '-'} - {h2hMatch.goals.home ?? '-'}
                              </span>
                              <span className={`flex-1 text-left text-xs sm:text-sm whitespace-normal leading-tight ${h2hMatch.teams.away.winner ? 'text-[#ffd700]' : 'text-white'}`}>{translateTeamKu(h2hMatch.teams.away.name)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : !isLiveApiActive && matches.length === 0 ? (
            <div id="api-setup-guide" className="p-8 md:p-16 max-w-2xl mx-auto flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl animate-pulse">
                🔑
              </div>
              <h3 className="text-white font-extrabold text-lg md:text-xl tracking-tight leading-relaxed">
                APIـی تۆمار نەکراوە و تکایە دایبنێ و وێبسایتەکە نوێبکەرەوە
              </h3>
            </div>
          ) : (
            <div id="no-match-selected-placeholder" className="p-16 text-center m-auto flex flex-col items-center justify-center max-w-md">
              <Trophy className="w-16 h-16 text-white/5 mb-4 animate-bounce-slow" />
              <h3 className="text-white font-bold text-lg">یارییەک دیاری بکە</h3>
            </div>
          )}
        </section>
        </>        ) : activeNavTab === 'standings' ? (
          /* Real-time Group Standings Interface */
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/30 pb-24 lg:pb-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Standings Header */}
              <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    🏆 خشتەی کۆمەڵەکانی مۆندیال
                  </h2>
                </div>
                {/* Visual Legend indicator */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/40 font-semibold bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg max-w-full md:max-w-none" dir="rtl">
                  <span><strong className="text-emerald-400">ب</strong>: بردنەوە</span>
                  <span><strong className="text-slate-200">ی</strong>: یەکسانبوون</span>
                  <span><strong className="text-rose-400">د</strong>: دۆڕان</span>
                  <span><strong className="text-white/60">گ.ت</strong>: گۆڵی تۆمارکراو</span>
                  <span><strong className="text-white/60">گ.ل</strong>: گۆڵی لێکراو</span>
                  <span><strong className="text-white/60">ج.گ</strong>: جیاوازی گۆڵ</span>
                </div>
              </div>

              {isLiveApiActive && realStandings.length > 0 ? (
                isRealStandingsLoading ? (
                  <div className="text-center p-12 text-white/50">باردەکرێت...</div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {realStandings.map((groupStandings: any, idx: number) => {
                      const groupName = groupStandings[0]?.group || `Group ${idx + 1}`;
                      const groupKuName = GROUP_NAMES_KU[groupName] || translateTeamKu(groupName);
                      return (
                        <div key={idx} className="bg-imm-header rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                          <div className="bg-[#0a0e1a] px-5 py-4 border-b border-white/5 flex items-center justify-between">
                            <span className="font-extrabold text-white text-sm md:text-base">
                              {groupKuName}
                            </span>
                            <span className="text-[10px] font-mono uppercase bg-gold-bright/10 text-gold-bright px-2.5 py-0.5 rounded border border-gold-bright/20 font-bold">
                              {groupName}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-center text-xs md:text-sm font-sans font-medium">
                              <thead>
                                <tr className="border-b border-white/5 text-white/45 font-bold bg-[#0d1222]/30">
                                  <th className="py-3 px-4 text-start">ریزبەندی / تیم</th>
                                  <th className="py-3 px-1.5 w-10" title="یارییە ئەنجامدراوەکان">یاری</th>
                                  <th className="py-3 px-1.5 w-10 text-emerald-400" title="بردنی یارییەکان">ب</th>
                                  <th className="py-3 px-1.5 w-10 text-slate-200" title="یەکسانبوون">ی</th>
                                  <th className="py-3 px-1.5 w-10 text-rose-400 font-bold" title="دۆڕان">د</th>
                                  <th className="py-3 px-1.5 w-12 text-white/50" title="گۆڵی تۆمارکراو">گ.ت</th>
                                  <th className="py-3 px-1.5 w-12 text-white/50" title="گۆڵی لێکراو">گ.ل</th>
                                  <th className="py-3 px-1.5 w-12" title="جیاوازی گۆڵ">ج.گ</th>
                                  <th className="py-3 px-4 w-16 text-[#ecd393]" title="کۆی گشتی خاڵەکان">خاڵ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupStandings.map((st: any) => {
                                  const teamKuName = translateTeamKu(st.team?.name || '');
                                  const gd = st.goalsDiff !== undefined ? st.goalsDiff : (st.all?.goals?.for - st.all?.goals?.against) || 0;
                                  return (
                                    <tr key={st.team.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                      <td className="py-3 px-4 text-start font-semibold text-white flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 flex items-center justify-center font-mono">
                                          {st.rank}
                                        </span>
                                        <TeamLogo team={st.team} className="w-5 h-5 rounded-full" />
                                        <span className="font-bold text-xs sm:text-sm text-white/90 whitespace-normal leading-tight">{teamKuName}</span>
                                      </td>
                                      <td className="py-3 px-1.5 font-bold text-white/80">{st.all?.played || 0}</td>
                                      <td className="py-3 px-1.5 text-emerald-400 font-bold bg-emerald-500/5">{st.all?.win || 0}</td>
                                      <td className="py-3 px-1.5 text-slate-300 font-medium">{st.all?.draw || 0}</td>
                                      <td className="py-3 px-1.5 text-rose-400 font-medium">{st.all?.lose || 0}</td>
                                      <td className="py-3 px-1.5 font-mono text-white/70">{st.all?.goals?.for || 0}</td>
                                      <td className="py-3 px-1.5 font-mono text-white/40">{st.all?.goals?.against || 0}</td>
                                      <td className={`py-3 px-1.5 font-mono font-bold ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                                        {gd > 0 ? `+${gd}` : gd}
                                      </td>
                                      <td className="py-3 px-4 font-bold font-display text-gold-bright bg-gold-bright/10 border-s border-white/5 font-mono">{st.points}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="bg-imm-header p-16 text-center rounded-2xl border border-white/10 shadow-xl max-w-xl mx-auto space-y-4">
                  <AlertCircle className="w-12 h-12 text-[#ecd393] mx-auto animate-pulse" />
                  <h3 className="text-white font-bold text-lg">هیچ زانیارییەک بەردەست نییە.</h3>
                </div>
              )}
            </div>
          </div>
        ) : activeNavTab === 'scorers' ? (
          /* Top Goal Scorers Golden Boot Interface */
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/30 pb-24 lg:pb-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Scorers Header */}
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  🏅 ئاماری سەرجەم یاریزانان لە کاتی مۆندیال
                </h2>
                <p className="text-xs text-white/40 font-sans mt-0.5">
                  گۆڵکاران، خاوەن زۆرترین ئاسیست و کارتەکانی یاریزانان راستەوخۆ لێرەوە دەبینیت.
                </p>
              </div>

              {isLiveApiActive ? (
                <div className="space-y-6">
                  {/* Option pills */}
                  <div className="flex flex-wrap gap-2 justify-center border-b border-white/5 pb-4">
                    {[
                      { type: 'topscorers', title: '⚽️ گۆڵکاران' },
                      { type: 'topassists', title: '👟 ئەسیست' },
                      { type: 'topyellowcards', title: '🟨 کارتە زەردەکان' },
                      { type: 'topredcards', title: '🟥 کارتە سوورەکان' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => setRealPlayerStatsType(item.type as any)}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                          realPlayerStatsType === item.type
                            ? 'bg-[#ecd393] text-black border-[#ecd393] shadow-lg shadow-amber-500/10'
                            : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>

                  {isRealPlayerStatsLoading ? (
                    <div className="text-center p-12 text-white/50">باردەکرێت...</div>
                  ) : realPlayerStats.length === 0 ? (
                    <div className="text-center p-12 text-white/30">هیچ زانیارییەک بەردەست نییە بۆ ئەم جۆرە ئامارە.</div>
                  ) : (
                    <div className="bg-imm-header rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-w-2xl mx-auto">
                      <div className="p-4 bg-[#0a0e1a] border-b border-white/5 text-white/45 text-xs font-bold flex justify-between uppercase font-mono tracking-wider">
                        <span>یاریزان / تیم</span>
                        <span className="text-end select-none font-bold">کۆی ئامار</span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {realPlayerStats.slice(0, 15).map((item: any, idx: number) => {
                          const p = item.player || {};
                          const stats = item.statistics?.[0] || {};
                          const teamLogo = stats.team?.logo;
                          const teamNameKu = translateTeamKu(stats.team?.name || '');
                          
                          let statVal = 0;
                          let statLabel = '';
                          if (realPlayerStatsType === 'topscorers') {
                            statVal = stats.goals?.total || 0;
                            statLabel = 'گۆڵ';
                          } else if (realPlayerStatsType === 'topassists') {
                            statVal = stats.goals?.assists || 0;
                            statLabel = 'ئاسیست';
                          } else if (realPlayerStatsType === 'topyellowcards') {
                            statVal = stats.cards?.yellow || 0;
                            statLabel = 'کارتی زەرد';
                          } else if (realPlayerStatsType === 'topredcards') {
                            statVal = stats.cards?.red || 0;
                            statLabel = 'کارتی سوور';
                          }

                          const rankColor = idx === 0 
                            ? 'bg-amber-500 text-black border-amber-300 font-black shadow-lg shadow-amber-500/20' 
                            : idx === 1 
                            ? 'bg-zinc-300 text-zinc-950 border-zinc-250 font-bold' 
                            : idx === 2 
                            ? 'bg-amber-700 text-white border-amber-600 font-bold' 
                            : 'bg-white/5 text-white/40 border-white/10';

                          return (
                            <div key={p.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-all">
                              <div className="flex items-center gap-4 text-start">
                                <span className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center font-mono font-bold shrink-0 ${rankColor}`}>
                                  {idx + 1}
                                </span>
                                {p.photo ? <img src={p.photo} className="w-9 h-9 rounded-full border border-white/10 shrink-0" alt="" referrerPolicy="no-referrer" /> : null}
                                <div>
                                  <h4 className="font-extrabold text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                                    {p.name}
                                  </h4>
                                  <p className="text-[10px] text-white/45 font-sans tracking-tight mt-0.5 flex items-center gap-1.5">
                                    {teamLogo ? <img src={teamLogo} className="w-3.5 h-3.5 rounded bg-white/5 shrink-0 object-contain inline" alt="" referrerPolicy="no-referrer" /> : null}
                                    <span>{teamNameKu}</span>
                                    <span>•</span>
                                    <span>{translateTextKu(stats.games?.position || '') || 'یاریزان'}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs sm:text-sm text-gold-bright bg-gold-bright/5 border border-gold-bright/15 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
                                  <span className="text-white">{statVal}</span> {statLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-imm-header p-16 text-center rounded-2xl border border-white/10 shadow-xl max-w-xl mx-auto space-y-4">
                  <AlertCircle className="w-12 h-12 text-[#ecd393] mx-auto animate-pulse" />
                  <h3 className="text-white font-bold text-lg">هیچ زانیارییەک بەردەست نییە.</h3>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Real-time Injuries & Suspensions Tab */
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/30 pb-24 lg:pb-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Injuries Header */}
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  🏥 پێکانەکان و سزادراوانی خولی ٢٠٢٦
                </h2>
                <p className="text-xs text-white/40 font-sans mt-0.5">
                  لیستی نوێترین پێکان و دوورخستنەوە سەرجەم یاریزانانی هەڵبژاردەکان لە جامی جیھانی.
                </p>
              </div>

              {!isLiveApiActive ? (
                <div className="bg-imm-header p-16 text-center rounded-2xl border border-white/10 shadow-xl max-w-xl mx-auto space-y-4">
                  <AlertCircle className="w-12 h-12 text-[#ecd393] mx-auto animate-pulse" />
                  <h3 className="text-white font-bold text-lg">هیچ زانیارییەک بەردەست نییە.</h3>
                </div>
              ) : isRealInjuriesLoading ? (
                <div className="text-center p-12 text-white/50">باردەکرێت...</div>
              ) : realInjuries.length === 0 ? (
                <div className="bg-imm-header p-16 text-center rounded-2xl border border-white/10 shadow-xl max-w-xl mx-auto space-y-4">
                  <AlertCircle className="w-12 h-12 text-[#ecd393] mx-auto animate-pulse" />
                  <h3 className="text-white font-bold text-lg">هیچ زانیارییەک بەردەست نییە.</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {realInjuries.map((item: any, idx: number) => {
                    const p = item.player || {};
                    const team = item.team || {};
                    return (
                      <div key={idx} className="bg-imm-header p-4 rounded-xl border border-white/10 flex items-start gap-4 hover:bg-white/5 transition-all text-start">
                        {p.photo ? (
                          <img src={p.photo} className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-black/20 shrink-0" alt="" referrerPolicy="no-referrer" />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-white text-sm truncate">{p.name || 'یاریزان'}</h4>
                          <p className="text-[10px] text-white/50 flex items-center justify-start gap-1 mt-0.5 font-sans">
                            {team.logo ? <img src={team.logo} className="w-3.5 h-3.5 rounded bg-white/5 object-contain inline" alt="" referrerPolicy="no-referrer" /> : null}
                            <span>{translateTeamKu(team.name)}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5 justify-start">
                            <span className="px-2.5 py-0.5 text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                              ⚠️ {translateTextKu(p.reason) || 'پێکان'}
                            </span>
                            <span className="px-2.5 py-0.5 text-[9px] font-bold bg-white/5 text-white/40 border border-white/5 rounded-md">
                              {translateTextKu(p.type) || 'پێکان'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* 3. Premium Mobile Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0a0c10]/95 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveNavTab('matches')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full p-2 transition-all ${
            activeNavTab === 'matches'
              ? 'text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <div className={`p-1.5 rounded-full ${activeNavTab === 'matches' ? 'bg-[#ffd700]/10' : ''}`}>
            ⚽
          </div>
          <span className="text-[9px] font-black tracking-wider">یارییەکان</span>
        </button>
        <button
          onClick={() => setActiveNavTab('standings')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full p-2 transition-all ${
            activeNavTab === 'standings'
              ? 'text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <div className={`p-1.5 rounded-full ${activeNavTab === 'standings' ? 'bg-[#ffd700]/10' : ''}`}>
            📊
          </div>
          <span className="text-[9px] font-black tracking-wider">کۆمەڵەکان</span>
        </button>
        <button
          onClick={() => setActiveNavTab('scorers')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full p-2 transition-all ${
            activeNavTab === 'scorers'
              ? 'text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <div className={`p-1.5 rounded-full ${activeNavTab === 'scorers' ? 'bg-[#ffd700]/10' : ''}`}>
            🏅
          </div>
          <span className="text-[9px] font-black tracking-wider">گۆڵکاران</span>
        </button>
        <button
          onClick={() => setActiveNavTab('injuries')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full p-2 transition-all ${
            activeNavTab === 'injuries'
              ? 'text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <div className={`p-1.5 rounded-full ${activeNavTab === 'injuries' ? 'bg-[#ffd700]/10' : ''}`}>
            🏥
          </div>
          <span className="text-[9px] font-black tracking-wider">پێکانەکان</span>
        </button>
      </nav>

      {/* 4. Goal Celebration Immersive Overlay */}
      {goalOverlay?.show && (
        <div id="goal-alert-toast" className="fixed inset-x-4 bottom-14 sm:bottom-16 md:max-w-md md:mx-auto bg-gradient-to-r from-[#8a1538] to-[#bd1a4d] border-2 border-gold-bright rounded-2xl p-5 shadow-2xl shadow-rose-950/40 z-50 animate-bounce flex items-center gap-4 text-white">
          <div className="text-3xl animate-spin-slow flex-shrink-0">⚽</div>
          <div className="flex-1 font-sans text-start">
            <h4 className="text-[#ecd393] font-extrabold text-xl font-display uppercase tracking-wide leading-none">
              گۆۆۆۆۆۆۆڵ !!!
            </h4>
            <p className="text-sm font-semibold tracking-wide mt-1">
              یاریزانی تیمی <span className="underline font-bold text-gold-bright">{goalOverlay.teamNameKu}</span> تۆمارکەر بوو!
            </p>
            <p className="text-xs text-slate-350 mt-1 font-light italic">
              گۆڵکەر: {translateTextKu(goalOverlay.scorer)}
            </p>
          </div>
          <div className="bg-black/60 px-3 py-2 rounded-xl text-center border border-rose-900 font-sans shrink-0">
            <span className="text-[10px] text-gray-300 block">ئەنجام</span>
            <span dir="ltr" className="font-mono font-black text-white text-lg tracking-wider block mt-1">{goalOverlay.score}</span>
          </div>
        </div>
      )}
    </div>
  );
}
