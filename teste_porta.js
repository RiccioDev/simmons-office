// Testa o fluxo de "bater à porta" no servidor
const WebSocket = require('ws');
const http = require('http');
const BASE = process.env.BASE || 'http://localhost:3000';
const WSBASE = BASE.replace('http', 'ws');

function post(caminho, corpo, token) {
  return new Promise((ok, erro) => {
    const dados = JSON.stringify(corpo || {});
    const u = new URL(caminho, BASE);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dados),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { ok(JSON.parse(d)); } catch (e) { ok({}); } });
    });
    req.on('error', erro);
    req.write(dados);
    req.end();
  });
}

function entrar(token, nome) {
  return new Promise((ok) => {
    const ws = new WebSocket(WSBASE);
    const recebidas = [];
    ws.on('open', () => {
      ws.send(JSON.stringify({ t: 'auth', token }));
      ws.send(JSON.stringify({ t: 'entrar', name: nome }));
    });
    ws.on('message', (d) => {
      const m = JSON.parse(d);
      recebidas.push(m);
      if (m.t === 'bemvindo') ok({ ws, recebidas, id: m.id });
    });
  });
}

const espera = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const a = await post('/api/login', { usuario: 'joao', senha: 'teste123' });
  const b = await post('/api/login', { usuario: 'maria', senha: 'vento-ceu-350' });
  if (!a.token || !b.token) { console.log('ERRO login', a, b); process.exit(1); }

  const joao = await entrar(a.token, 'Joao Riccio');
  const maria = await entrar(b.token, 'Maria Silva');
  await espera(1200);

  // joao reclama a mesa 2, senta-se e tranca
  joao.ws.send(JSON.stringify({ t: 'reclamarMesa', deskId: 2, nome: 'Joao Riccio' }));
  await espera(700);
  joao.ws.send(JSON.stringify({ t: 'sentar', deskId: 2, nome: 'Joao Riccio' }));
  await espera(700);
  joao.ws.send(JSON.stringify({ t: 'fecharMesa', deskId: 2, nome: 'Joao Riccio' }));
  await espera(900);

  const est = maria.recebidas.filter(m => m.t === 'estado').pop();
  const mesaPorMsg = maria.recebidas.filter(m => m.t === 'mesa' && m.desk.id === 2).pop();
  const mesa2 = mesaPorMsg ? mesaPorMsg.desk : (est && est.desks.find(d => d.id === 2));
  console.log('mesa 2 ->', JSON.stringify(mesa2 && { dono: mesa2.owner, locked: mesa2.locked, ocupada: mesa2.occupied ? 'sim' : 'nao' }));

  // maria bate à porta
  maria.ws.send(JSON.stringify({ t: 'bater', deskId: 2 }));
  await espera(900);
  const batida = joao.recebidas.find(m => m.t === 'batida');
  console.log('joao recebeu batida:', batida ? ('de ' + batida.nome + ' na ' + batida.mesa) : 'NAO');

  // joao abre
  joao.ws.send(JSON.stringify({ t: 'responderBatida', para: maria.id, aceitar: true }));
  await espera(900);
  const portaM = maria.recebidas.filter(m => m.t === 'porta').pop();
  const portaJ = joao.recebidas.filter(m => m.t === 'porta').pop();
  console.log('maria recebeu porta:', portaM ? JSON.stringify({ com: portaM.com === joao.id ? 'joao' : portaM.com, aberta: portaM.aberta }) : 'NAO');
  console.log('joao recebeu porta:', portaJ ? JSON.stringify({ aberta: portaJ.aberta }) : 'NAO');

  joao.ws.close(); maria.ws.close();
  setTimeout(() => process.exit(0), 500);
})();
