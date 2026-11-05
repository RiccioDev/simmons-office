const WebSocket = require('ws');
const URL = 'wss://simmons-office.onrender.com';

function cliente(nome) {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL);
    const avisos = [];
    ws.on('open', () => ws.send(JSON.stringify({ t: 'entrar', name: nome })));
    ws.on('message', (d) => {
      const m = JSON.parse(d);
      if (m.t === 'aviso') avisos.push(m.texto);
      if (m.t === 'bemvindo') resolve({ ws, avisos, id: m.id });
    });
  });
}

const espera = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const a = await cliente('TesteBug');
  await espera(1500);

  // 1) reclamar a mesa 3
  a.ws.send(JSON.stringify({ t: 'reclamarMesa', deskId: 3, nome: 'Dono Mesa 3' }));
  await espera(1500);

  // 2) tentar fechar a mesa 5 (que nao e dele)
  a.ws.send(JSON.stringify({ t: 'fecharMesa', deskId: 5, nome: 'Dono Mesa 3' }));
  await espera(2000);

  // 3) tentar reclamar uma segunda mesa
  a.ws.send(JSON.stringify({ t: 'reclamarMesa', deskId: 8, nome: 'Dono Mesa 3' }));
  await espera(2000);

  console.log('avisos recebidos:', a.avisos.length ? a.avisos : 'nenhum');
  a.ws.close();
  process.exit(0);
})();
