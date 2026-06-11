import http from 'http';

http.get('http://localhost:3000/api/matches', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = JSON.parse(data);
    const rounds = {};
    matches.forEach(m => {
      rounds[m.round] = (rounds[m.round] || 0) + 1;
    });
    console.log(rounds);
  });
});
