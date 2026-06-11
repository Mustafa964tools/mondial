const https = require('https');
https.get('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports'), (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    try {
      const parsed = JSON.parse(data);
      console.log(parsed.contents.slice(0, 15000));
    } catch(e) {
      console.log('Error parsing JSON:', e);
    }
  });
});
