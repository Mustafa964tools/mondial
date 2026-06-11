import https from 'https';

https.get('https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data.slice(0, 10000));
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
