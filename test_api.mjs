import 'dotenv/config';

async function check() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const wcUrl = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';
  const response = await fetch(wcUrl, {
    headers: { 'x-apisports-key': apiKey, 'Accept': 'application/json' },
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
