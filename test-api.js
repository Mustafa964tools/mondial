const fetch = require('node-fetch');

async function test() {
  const url = 'https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept': 'text/html'
    }
  });
  if (!res.ok) {
    console.log("Failed:", res.status);
    return;
  }
  const text = await res.text();
  console.log("Content length:", text.length);
  // print excerpts
  const lines = text.split('\n');
  const interesting = lines.filter(l => l.toLowerCase().includes('league') || l.toLowerCase().includes('id') || l.toLowerCase().includes('endpoint') || l.toLowerCase().includes('2026')).slice(0, 30);
  console.log(interesting.join('\n'));
}
test();
