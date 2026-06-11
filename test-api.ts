export async function test() {
  const url = 'http://127.0.0.1:3000/api/football/proxy?url=fixtures?league=10&season=2026';
  const res = await fetch(url);
  const data = await res.json();
  const f = (data.response || []);
  console.log(`Found ${f.length} friendlies for 2026...`);
  if (f.length > 0) {
    console.log("Team 1:", f[0].teams.home.name);
    console.log("Events array for first match:", f[0].events);
  }
}
test();
