// Simmons Office — servidor de estado e sinalização WebRTC
// Node + ws. Serve a pasta public/ e mantém o estado do escritório.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DESKS_FILE = path.join(__dirname, 'mesas.json');

// ---------------------------------------------------------------- mesas
// 10 mesas, duas filas de cinco. Coordenadas em píxeis do mapa (1600x1000).
function mesasIniciais() {
  const mesas = [];
  let n = 1;
  for (let fila = 0; fila < 2; fila++) {
    for (let col = 0; col < 5; col++) {
      mesas.push({
        id: n,
        label: 'Mesa ' + n,
        x: 150 + col * 280,
        y: fila === 0 ? 210 : 610,
        w: 180,
        h: 90,
        owner: '',      // nome de quem é a mesa
        locked: false,  // fechada = só o dono se senta
        occupied: '',   // id de quem está sentado agora
      });
      n++;
    }
  }
  return mesas;
}

let desks = mesasIniciais();

const armazem = require('./armazenamento');

// aplicar o que estiver guardado (Postgres ou ficheiro)
armazem.carregar().then((guardado) => {
  for (const d of desks) {
    const g = guardado.get(d.id);
    if (g) {
      d.owner = g.owner;
      d.locked = g.locked;
    }
  }
  console.log('mesas carregadas de: ' + armazem.modoArmazenamento());
  broadcastEstado();
}).catch((e) => console.log('erro ao carregar mesas:', e.message));

function guardarMesas() {
  global.__mesasParaFicheiro = desks;
  armazem.gravar({ id: 0 }); // garante a lista completa no fallback
  for (const d of desks) {
    armazem.gravar(d).catch((e) => console.log('erro ao gravar mesa', d.id, e.message));
  }
}

// ---------------------------------------------------------------- jogadores
const players = new Map(); // id -> dados

const CORES = [
  '#c9a227', '#4ea8de', '#e76f51', '#2a9d8f', '#9b5de5',
  '#f4a261', '#43aa8b', '#f28482', '#577590', '#b56576',
];

// ---------------------------------------------------------------- http
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const caminho = req.url.split('?')[0];

  // diagnostico: onde estao a ser guardadas as mesas
  if (caminho === '/api/estado') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      armazenamento: armazem.modoArmazenamento(),
      online: players.size,
      mesas: desks.map(d => ({ id: d.id, owner: d.owner, locked: d.locked })),
    }));
  }

  let file = caminho;
  if (file === '/' || file === '') file = '/index.html';
  const full = path.join(PUBLIC, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end('403'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('nao encontrado'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

// ---------------------------------------------------------------- ws
const wss = new WebSocketServer({ server });

function enviar(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(obj, exceptId) {
  const txt = JSON.stringify(obj);
  for (const [id, p] of players) {
    if (id === exceptId) continue;
    if (p.ws.readyState === 1) p.ws.send(txt);
  }
}

function estadoPublico() {
  return {
    players: [...players.values()].map(p => ({
      id: p.id, name: p.name, x: p.x, y: p.y, cor: p.cor,
      sitting: p.sitting, deskId: p.deskId, muted: p.muted, camOn: p.camOn,
    })),
    desks: desks.map(d => ({
      id: d.id, label: d.label, x: d.x, y: d.y, w: d.w, h: d.h,
      owner: d.owner, locked: d.locked, occupied: d.occupied,
    })),
  };
}

function broadcastEstado() {
  broadcast({ t: 'estado', ...estadoPublico() });
}

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 9);
  ws.id = id;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const p = players.get(id);

    if (msg.t === 'entrar') {
      const mesa = desks.find(d => d.owner && d.owner.toLowerCase() === String(msg.name || '').toLowerCase().trim());
      const jogador = {
        id,
        ws,
        name: String(msg.name || 'Convidado').slice(0, 24).trim() || 'Convidado',
        x: mesa ? mesa.x + mesa.w / 2 : 800,
        y: mesa ? mesa.y + mesa.h + 40 : 500,
        cor: CORES[players.size % CORES.length],
        sitting: false,
        deskId: null,
        muted: false,
        camOn: true,
      };
      players.set(id, jogador);
      enviar(ws, { t: 'bemvindo', id, ...estadoPublico() });
      broadcast({ t: 'entrou', id, name: jogador.name }, id);
      broadcastEstado();
      return;
    }

    if (!p) return;

    switch (msg.t) {
      case 'mover': {
        p.x = Math.max(0, Math.min(1600, Number(msg.x) || 0));
        p.y = Math.max(0, Math.min(1000, Number(msg.y) || 0));
        broadcast({ t: 'mover', id, x: p.x, y: p.y }, id);
        break;
      }
      case 'sentar': {
        const d = desks.find(x => x.id === msg.deskId);
        if (!d) return;
        if (d.occupied && d.occupied !== id) { enviar(ws, { t: 'aviso', texto: 'Essa mesa está ocupada.' }); return; }
        if (d.locked && d.owner && d.owner.toLowerCase() !== p.name.toLowerCase() && d.owner.toLowerCase() !== String(msg.nome || '').toLowerCase()) {
          enviar(ws, { t: 'aviso', texto: 'A mesa ' + d.label + ' está fechada.' });
          return;
        }
        if (p.deskId) {
          const antiga = desks.find(x => x.id === p.deskId);
          if (antiga && antiga.occupied === id) antiga.occupied = '';
        }
        d.occupied = id;
        p.sitting = true;
        p.deskId = d.id;
        p.x = d.x + d.w / 2;
        p.y = d.y + d.h / 2;
        broadcastEstado();
        break;
      }
      case 'levantar': {
        if (p.deskId) {
          const d = desks.find(x => x.id === p.deskId);
          if (d && d.occupied === id) d.occupied = '';
        }
        p.sitting = false;
        p.deskId = null;
        broadcastEstado();
        break;
      }
      case 'fecharMesa': {
        const d = desks.find(x => x.id === msg.deskId);
        if (!d) return;
        // só o dono (ou quem a reclamar pela primeira vez) pode fechar/abrir
        if (!d.owner) { d.owner = p.name; }
        if (d.owner.toLowerCase() !== p.name.toLowerCase() && d.owner.toLowerCase() !== String(msg.nome || '').toLowerCase()) {
          enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' é de ' + d.owner + '.' });
          return;
        }
        d.locked = !d.locked;
        guardarMesas();
        broadcast({ t: 'mesa', desk: { ...d } });
        break;
      }
      case 'reclamarMesa': {
        const d = desks.find(x => x.id === msg.deskId);
        if (!d) return;
        // o nome da mesa é o que a pessoa escrever no claim (nao o nome do login)
        const nome = String(msg.nome || p.name).slice(0, 28).trim() || p.name;
        const meuDono = d.owner && (d.owner.toLowerCase() === p.name.toLowerCase() || d.owner.toLowerCase() === nome.toLowerCase());
        if (d.owner && !meuDono) {
          enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' já é de ' + d.owner + '.' });
          return;
        }
        d.owner = nome;
        guardarMesas();
        broadcast({ t: 'mesa', desk: { ...d } });
        enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' agora é tua.' });
        break;
      }
      case 'mic': {
        p.muted = !!msg.muted;
        broadcast({ t: 'player', id, muted: p.muted }, id);
        break;
      }
      case 'cam': {
        p.camOn = !!msg.camOn;
        broadcast({ t: 'player', id, camOn: p.camOn }, id);
        break;
      }
      case 'chat': {
        const texto = String(msg.texto || '').slice(0, 500).trim();
        if (!texto) return;
        broadcast({ t: 'chat', de: p.name, cor: p.cor, texto, hora: Date.now() });
        break;
      }
      // ---- sinalização WebRTC (vai só para o destinatário)
      case 'sinal': {
        const alvo = players.get(msg.para);
        if (alvo && alvo.ws.readyState === 1) {
          alvo.ws.send(JSON.stringify({ t: 'sinal', de: id, dados: msg.dados }));
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    const p = players.get(id);
    if (p && p.deskId) {
      const d = desks.find(x => x.id === p.deskId);
      if (d && d.occupied === id) d.occupied = '';
    }
    players.delete(id);
    broadcast({ t: 'saiu', id });
    broadcastEstado();
  });
});

server.listen(PORT, () => {
  console.log('Simmons Office a correr em http://localhost:' + PORT);
});
