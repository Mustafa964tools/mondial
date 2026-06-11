const https = require('https');
https.get('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports'), (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    console.log(data.slice(0, 5000));
    console.log("...");
    console.log(data.slice(-5000));
  });
});
