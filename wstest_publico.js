const WebSocket = require('ws');
const fs = require('fs');
const url = fs.readFileSync('url_publica.txt', 'utf8').trim().replace('https://', 'wss://');
const ws = new WebSocket(url);
ws.on('open', () => { console.log('wss aberto:', url); ws.send(JSON.stringify({ t: 'entrar', name: 'TesteExterno' })); });
ws.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.t === 'bemvindo') {
    console.log('bemvindo OK | players=' + m.players.length + ' desks=' + m.desks.length);
    ws.close(); process.exit(0);
  }
});
ws.on('error', e => { console.log('erro:', e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(2); }, 12000);
