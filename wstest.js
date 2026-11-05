const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => { console.log('aberto'); ws.send(JSON.stringify({ t: 'entrar', name: 'Teste' })); });
ws.on('message', (d) => {
  const m = JSON.parse(d);
  console.log('recebi:', m.t, m.t === 'bemvindo' ? ('id=' + m.id + ' players=' + m.players.length + ' desks=' + m.desks.length) : '');
  if (m.t === 'bemvindo') { ws.close(); process.exit(0); }
});
ws.on('error', e => { console.log('erro:', e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(2); }, 5000);
