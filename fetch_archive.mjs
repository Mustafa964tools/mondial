import https from 'https';
https.get('https://archive.org/wayback/available?url=https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
