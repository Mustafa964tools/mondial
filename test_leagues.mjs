import 'dotenv/config';

async function check() {
  const apiKey = process.env.API_FOOTBALL_KEY;

  const url = 'https://v3.football.api-sports.io/leagues?search=World Cup';
  const response = await fetch(url, {
    headers: { 'x-apisports-key': apiKey, 'Accept': 'application/json' },
  });
  const data = await response.json();
  const wc = data.response.filter(l => l.league.name === 'World Cup' || l.league.id === 1);
  console.log(JSON.stringify(wc, null, 2));
}
check();
