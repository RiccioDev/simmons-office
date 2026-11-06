// Simmons Office — servidor de estado e sinalização WebRTC
// Node + ws. Serve a pasta public/ e mantém o estado do escritório.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const FICHEIROS = path.join(__dirname, 'ficheiros');
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
        x: 396 + col * 112,
        y: fila === 0 ? 380 : 580,
        w: 64,
        h: 96,
        owner: '',      // nome de quem é a mesa
        locked: false,  // fechada = só o dono se senta
        occupied: '',   // id de quem está sentado agora
        estilo: {},     // tampo, computador, cadeira e decorações escolhidos
      });
      n++;
    }
  }
  return mesas;
}

let desks = mesasIniciais();

const armazem = require('./armazenamento');
const auth = require('./auth');
const chat = require('./mensagens');
const fsp = require('fs').promises;
const crypto = require('crypto');

// aplicar o que estiver guardado (Postgres ou ficheiro)
armazem.carregar().then((guardado) => {
  for (const d of desks) {
    const g = guardado.get(d.id);
    if (g) {
      d.owner = g.owner;
      d.ownerUser = g.ownerUser || '';
      d.locked = g.locked;
      d.estilo = g.estilo || {};
    }
  }
  console.log('mesas carregadas de: ' + armazem.modoArmazenamento());
  broadcastEstado();
  limparMesasOrfas();
}).catch((e) => console.log('erro ao carregar mesas:', e.message));

function guardarMesas() {
  global.__mesasParaFicheiro = desks;
  armazem.gravar({ id: 0 }); // garante a lista completa no fallback
  for (const d of desks) {
    armazem.gravar(d).catch((e) => console.log('erro ao salvar mesa', d.id, e.message));
  }
}

// ---------------------------------------------------------------- jogadores
const players = new Map(); // id -> dados
const portas = new Set();
const ultimaBatida = new Map();  // "quem|alvo" -> quando, para não repetir  // "donoId|visitanteId" — quem foi autorizado a entrar

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

  // backup: devolve o estado das mesas para guardar em ficheiro
  if (caminho === '/api/backup') {
    const chave = process.env.BACKUP_KEY || '';
    const enviada = req.headers['x-backup-key'] || '';
    const sessao = utilizadorDoPedido();
    const autorizado = (chave && enviada === chave) || (sessao && sessao.a);
    if (!autorizado) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ erro: 'não autorizado' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      data: new Date().toISOString(),
      armazenamento: armazem.modoArmazenamento(),
      mesas: desks.map(d => ({ id: d.id, label: d.label, owner: d.owner, locked: d.locked })),
    }, null, 1));
  }

  // ---------------------------------------------------------- autenticacao
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  const lerCorpo = () => new Promise((ok) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 10000) req.destroy(); });
    req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { ok({}); } });
  });

  const codigoOu = (x) => String(x || '');

  const utilizadorDoPedido = () => {
    const cab = req.headers.authorization || '';
    const token = cab.startsWith('Bearer ') ? cab.slice(7) : (req.headers['x-token'] || '');
    return auth.verificar(token);
  };

  // diagnostico publico minimo (sem dados de clientes)
  if (caminho === '/api/ping') {
    return json(200, {
      ok: true,
      versao: 'v2',
      mesasNoServidor: Array.isArray(desks) ? desks.length : -1,
      primeiraMesa: Array.isArray(desks) && desks[0] ? { id: desks[0].id, x: desks[0].x, y: desks[0].y, w: desks[0].w } : null,
      jogadores: players.size,
      armazenamento: armazem.modoArmazenamento(),
      mensagens: chat.modo(),
      mesasComDono: desks.filter(d => d.owner).length,
    });
  }

  // primeiro arranque: diz se ainda nao existe nenhuma conta
  if (caminho === '/api/setup') {
    if (req.method === 'GET') {
      return armazem.contarUtilizadores().then(n => json(200, { precisa: n === 0 }));
    }
  }

  // primeiro arranque: cria o administrador (so funciona enquanto nao houver contas)
  if (caminho === '/api/setup' && req.method === 'POST') {
    return lerCorpo().then(async (corpo) => {
      const n = await armazem.contarUtilizadores();
      if (n > 0) return json(409, { erro: 'Já existe uma conta. Use o login.' });
      if (!corpo.usuario || !corpo.senha || String(corpo.senha).length < 6) {
        return json(400, { erro: 'Informe o usuário e uma senha com 6 ou mais caracteres.' });
      }
      const hash = await auth.hashSenha(corpo.senha);
      await armazem.criarUtilizador({
        username: corpo.usuario,
        displayName: corpo.nome || corpo.usuario,
        senhaHash: hash,
        isAdmin: true,
      });
      const u = await armazem.buscarUtilizador(corpo.usuario);
      return json(200, { ok: true, token: auth.criarToken(u) });
    });
  }

  if (caminho === '/api/login' && req.method === 'POST') {
    return lerCorpo().then(async (corpo) => {
      const u = await armazem.buscarUtilizador(corpo.usuario);
      if (!u) return json(401, { erro: 'Usuário ou senha incorretos.' });
      const certo = await auth.conferirSenha(String(corpo.senha || ''), u.senha_hash);
      if (!certo) return json(401, { erro: 'Usuário ou senha incorretos.' });
      armazem.marcarVisto(u.username);
      return json(200, { ok: true, token: auth.criarToken(u), nome: u.display_name, admin: !!u.is_admin });
    });
  }

  if (caminho === '/api/eu') {
    const dados = utilizadorDoPedido();
    if (!dados) return json(401, { erro: 'sem sessao' });
    return json(200, { usuario: dados.u, nome: dados.n, admin: !!dados.a });
  }

  // ---------------------------------------------------------- convites
  if (caminho === '/api/convites') {
    const dados = utilizadorDoPedido();
    if (!dados || !dados.a) return json(403, { erro: 'só o administrador' });

    if (req.method === 'GET') {
      return armazem.listarConvites().then(l => json(200, { convites: l }));
    }

    if (req.method === 'POST') {
      return lerCorpo().then(async (corpo) => {
        const dias = Math.min(Math.max(Number(corpo.dias) || 7, 1), 30);
        const codigo = crypto.randomBytes(9).toString('base64')
          .replace(/\+/g, 'a').replace(/\//g, 'b').replace(/=+$/, '');
        const c = await armazem.criarConvite(codigo, dias, dados.u);
        return json(200, { ok: true, codigo: c.codigo, expira: c.expira, dias });
      });
    }
  }

  if (caminho === '/api/convites/remover' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados || !dados.a) return json(403, { erro: 'só o administrador' });
    return lerCorpo().then(async (corpo) => {
      await armazem.removerConvite(corpo.codigo);
      return json(200, { ok: true });
    });
  }

  // quem recebe o link cria a propria conta
  if (caminho === '/api/convite') {
    if (req.method === 'GET') {
      return armazem.buscarConvite(req.headers['x-convite'] || new URL(req.url, 'http://x').searchParams.get('codigo'))
        .then(c => {
          if (!c) return json(404, { valido: false, erro: 'Convite inválido.' });
          if (c.usado) return json(410, { valido: false, erro: 'Este convite já foi usado.' });
          if (new Date(c.expira) < new Date()) return json(410, { valido: false, erro: 'Este convite expirou.' });
          return json(200, { valido: true });
        });
    }

    if (req.method === 'POST') {
      return lerCorpo().then(async (corpo) => {
        const c = await armazem.buscarConvite(corpo.codigo);
        if (!c) return json(404, { erro: 'Convite inválido.' });
        if (c.usado) return json(410, { erro: 'Este convite já foi usado.' });
        if (new Date(c.expira) < new Date()) return json(410, { erro: 'Este convite expirou.' });
        if (!corpo.usuario || String(corpo.usuario).length < 3) return json(400, { erro: 'Usuário muito curto.' });
        if (!corpo.senha || String(corpo.senha).length < 6) return json(400, { erro: 'A senha precisa de 6 caracteres.' });

        try {
          await armazem.criarUtilizador({
            username: corpo.usuario,
            displayName: corpo.nome || corpo.usuario,
            senhaHash: await auth.hashSenha(corpo.senha),
            isAdmin: false,
          });
        } catch (e) {
          return json(400, { erro: e.message });
        }

        await armazem.usarConvite(codigoOu(corpo.codigo), String(corpo.usuario).toLowerCase().trim());
        const u = await armazem.buscarUtilizador(corpo.usuario);
        return json(200, { ok: true, token: auth.criarToken(u), nome: u.display_name });
      });
    }
  }

  // gestao de contas (so administrador)
  if (caminho === '/api/usuarios') {
    const dados = utilizadorDoPedido();
    if (!dados || !dados.a) return json(403, { erro: 'só o administrador' });

    if (req.method === 'GET') {
      return armazem.listarUtilizadores().then(l => json(200, { usuarios: l }));
    }

    if (req.method === 'POST') {
      return lerCorpo().then(async (corpo) => {
        if (!corpo.usuario) return json(400, { erro: 'Falta o usuário.' });
        const senha = corpo.senha && String(corpo.senha).length >= 6 ? corpo.senha : auth.senhaTemporaria();
        const hash = await auth.hashSenha(senha);
        try {
          await armazem.criarUtilizador({
            username: corpo.usuario,
            displayName: corpo.nome || corpo.usuario,
            senhaHash: hash,
            isAdmin: !!corpo.admin,
          });
          return json(200, { ok: true, usuario: corpo.usuario.toLowerCase().trim(), senha });
        } catch (e) {
          return json(400, { erro: e.message });
        }
      });
    }
  }

  if (caminho === '/api/mesas/limpar' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados || !dados.a) return json(403, { erro: 'só o administrador' });

    return armazem.listarUtilizadores().then((contas) => {
      const nomes = new Set((contas || []).map(u => String(u.display_name || '').toLowerCase().trim()));
      const users = new Set((contas || []).map(u => String(u.username || '').toLowerCase()));

      let n = 0;
      for (const d of desks) {
        if (!d.owner || d.occupied) continue;
        const donoUser = String(d.ownerUser || '').toLowerCase();
        const donoNome = String(d.owner || '').toLowerCase().trim();
        const temConta = donoUser ? users.has(donoUser) : nomes.has(donoNome);
        if (temConta) continue;

        d.owner = ''; d.ownerUser = ''; d.locked = false; d.occupied = null;
        n++; guardarMesas();
        broadcast({ t: 'mesa', desk: { ...d } });
      }
      if (n) broadcastEstado();
      return json(200, { ok: true, libertadas: n });
    }).catch(() => json(500, { erro: 'erro ao ler as contas' }));
  }

  if (caminho === '/api/mesas/libertar' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados || !dados.a) return json(403, { erro: 'só o administrador' });

    return lerCorpo().then((corpo) => {
      const d = desks.find(x => x.id === Number(corpo.deskId));
      if (!d) return json(404, { erro: 'mesa não encontrada' });

      d.owner = '';
      d.ownerUser = '';
      d.locked = false;
      d.occupied = null;
      guardarMesas();
      broadcast({ t: 'mesa', desk: { ...d } });
      broadcastEstado();
      return json(200, { ok: true, id: d.id });
    });
  }

  if (caminho === '/api/usuarios/remover' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados || !dados.a) return json(403, { erro: 'só o administrador' });
    return lerCorpo().then(async (corpo) => {
      const alvo = String(corpo.usuario || '').toLowerCase();
      if (!alvo) return json(400, { erro: 'Falta o usuário.' });
      if (alvo === dados.u) return json(400, { erro: 'Você não pode remover a própria conta.' });

      // nome de exibição, para casar com mesas antigas que só guardam o nome
      let nomeExibicao = '';
      try {
        const u = await armazem.buscarUtilizador(alvo);
        if (u) nomeExibicao = u.display_name || '';
      } catch (e) {}

      await armazem.removerUtilizador(alvo);

      const libertadas = libertarMesasDe(alvo, nomeExibicao);
      expulsarUtilizador(alvo);

      return json(200, { ok: true, mesasLibertadas: libertadas });
    });
  }

  if (caminho === '/api/senha' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados) return json(401, { erro: 'sem sessao' });
    return lerCorpo().then(async (corpo) => {
      const u = await armazem.buscarUtilizador(dados.u);
      if (!u) return json(401, { erro: 'conta inexistente' });
      const certo = await auth.conferirSenha(String(corpo.atual || ''), u.senha_hash);
      if (!certo) return json(401, { erro: 'Senha atual errada.' });
      if (!corpo.nova || String(corpo.nova).length < 6) return json(400, { erro: 'A nova senha precisa de 6 caracteres.' });
      await armazem.mudarSenha(dados.u, await auth.hashSenha(corpo.nova));
      return json(200, { ok: true });
    });
  }

  // diagnostico: onde estao a ser guardadas as mesas
  // ---------------------------------------------------------- chat guardado
  if (caminho === '/api/mensagens' && req.method === 'GET') {
    const dados = utilizadorDoPedido();
    if (!dados) return json(401, { erro: 'entre na sua conta' });
    return chat.listar()
      .then(lista => json(200, { mensagens: Array.isArray(lista) ? lista : [], dias: chat.DIAS }))
      .catch((e) => { console.log('mensagens:', e.message); json(500, { erro: 'erro ao ler' }); });
  }

  if (caminho === '/api/mensagens/fixar' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados) return json(401, { erro: 'entre na sua conta' });

    return lerCorpo().then(async (corpo) => {
      const r = await chat.fixar(String(corpo.id || ''), !!corpo.fixada);
      if (!r) return json(404, { erro: 'mensagem não encontrada' });
      broadcast({ t: 'fixada', id: r.id, fixada: r.fixada });
      return json(200, { ok: true, id: r.id, fixada: r.fixada });
    });
  }

  if (caminho === '/api/upload' && req.method === 'POST') {
    const dados = utilizadorDoPedido();
    if (!dados) return json(401, { erro: 'entre na sua conta' });

    return new Promise((ok) => {
      let cru = '';
      let passou = false;
      req.on('data', (c) => {
        cru += c;
        if (cru.length > 14 * 1024 * 1024) { passou = true; req.destroy(); }
      });
      req.on('end', async () => {
        if (passou) return ok(json(413, { erro: 'arquivo muito grande (máx. 10 MB)' }));
        let corpo;
        try { corpo = JSON.parse(cru || '{}'); } catch (e) { return ok(json(400, { erro: 'pedido inválido' })); }

        const mime = String(corpo.mime || 'application/octet-stream');
        const base64 = String(corpo.dados || '').replace(/^data:[^;]+;base64,/, '');
        if (!base64) return ok(json(400, { erro: 'sem arquivo' }));

        const bytes = Buffer.from(base64, 'base64');
        if (!bytes.length) return ok(json(400, { erro: 'arquivo vazio' }));
        if (bytes.length > 10 * 1024 * 1024) return ok(json(413, { erro: 'máximo 10 MB' }));

        let idFicheiro;
        try {
          idFicheiro = await chat.guardarFicheiro({
            nome: String(corpo.nome || 'arquivo').slice(0, 120),
            mime,
            bytes,
          });
        } catch (e) {
          console.log('upload:', e.message);
          return ok(json(500, { erro: 'não consegui salvar' }));
        }

        return ok(json(200, {
          url: '/ficheiros/' + idFicheiro,
          nome: String(corpo.nome || 'arquivo').slice(0, 120),
          mime,
          tamanho: bytes.length,
        }));
      });
    });
  }

  if (caminho === '/api/estado') {
    const dados = utilizadorDoPedido();
    if (!dados) return json(401, { erro: 'sem sessao' });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      armazenamento: armazem.modoArmazenamento(),
      diagnostico: armazem.diagnostico(),
      online: players.size,
      mesas: desks.map(d => ({ id: d.id, label: d.label, owner: d.owner, locked: d.locked })),
    }));
  }

  // anexos do chat
  if (caminho.startsWith('/ficheiros/')) {
    const nome = path.basename(caminho);
    const tipos = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
      '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
      '.zip': 'application/zip', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    };

    return chat.lerFicheiro(nome).then((f) => {
      if (!f) { res.writeHead(404); return res.end('não encontrado'); }
      res.writeHead(200, {
        'Content-Type': tipos[path.extname(nome).toLowerCase()] || f.mime || 'application/octet-stream',
        'Cache-Control': 'private, max-age=604800',
      });
      res.end(f.bytes);
    }).catch(() => { res.writeHead(500); res.end('erro'); });
  }

  let file = caminho;
  if (file === '/' || file === '') file = '/index.html';
  const full = path.join(PUBLIC, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end('403'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('não encontrado'); }
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

function socketsDe(p) {
  if (!p) return [];
  if (p.sockets && p.sockets.size) return [...p.sockets];
  return p.ws ? [p.ws] : [];
}

// manda a todos os dispositivos de um jogador
function enviarPara(p, obj, exceptWs) {
  const txt = JSON.stringify(obj);
  for (const s of socketsDe(p)) {
    if (s === exceptWs) continue;
    if (s.readyState === 1) s.send(txt);
  }
}

// exceptId: ignora este jogador. opcoes.mesmoDono: manda na mesma aos outros
// dispositivos da mesma conta. opcoes.exceptWs: não devolve a quem enviou.
function broadcast(obj, exceptId, opcoes) {
  const txt = JSON.stringify(obj);
  const mesmoDono = !!(opcoes && opcoes.mesmoDono);
  const exceptWs = opcoes && opcoes.exceptWs;
  for (const [id, p] of players) {
    if (id === exceptId && !mesmoDono) continue;
    for (const s of socketsDe(p)) {
      if (s === exceptWs) continue;
      if (s.readyState === 1) s.send(txt);
    }
  }
}

// no arranque: liberta mesas de contas que já não existem (ex.: removidas antes desta regra)
async function limparMesasOrfas() {
  try {
    const contas = await armazem.listarUtilizadores();
    const nomes = new Set((contas || []).map(u => String(u.display_name || '').toLowerCase().trim()));
    const users = new Set((contas || []).map(u => String(u.username || '').toLowerCase()));

    let libertadas = 0;
    for (const d of desks) {
      if (!d.owner) continue;

      const donoUser = String(d.ownerUser || '').toLowerCase();
      const donoNome = String(d.owner || '').toLowerCase().trim();

      const temConta = donoUser ? users.has(donoUser) : nomes.has(donoNome);
      if (temConta) continue;

      // não mexe em mesas com alguém sentado
      if (d.occupied) continue;

      d.owner = '';
      d.ownerUser = '';
      d.locked = false;
      d.occupied = null;
      libertadas++;
      guardarMesas();
      broadcast({ t: 'mesa', desk: { ...d } });
    }

    if (libertadas) {
      broadcastEstado();
      console.log('mesas libertadas no arranque (contas inexistentes): ' + libertadas);
    }
  } catch (e) {
    console.log('limparMesasOrfas:', e.message);
  }
}

// liberta as mesas de quem deixou de existir (por username e, nas antigas, pelo nome)
function libertarMesasDe(usuario, nomeExibicao) {
  const alvoUser = String(usuario || '').toLowerCase();
  const alvoNome = String(nomeExibicao || '').toLowerCase().trim();
  let n = 0;

  for (const d of desks) {
    const donoUser = String(d.ownerUser || '').toLowerCase();
    const donoNome = String(d.owner || '').toLowerCase().trim();
    const eraDele = (alvoUser && donoUser === alvoUser) ||
                    (alvoNome && donoNome === alvoNome) ||
                    (!donoUser && alvoNome && donoNome === alvoNome);
    if (!eraDele) continue;

    d.owner = '';
    d.ownerUser = '';
    d.locked = false;
    d.occupied = null;
    n++;
    guardarMesas();
    broadcast({ t: 'mesa', desk: { ...d } });
  }

  if (n) broadcastEstado();
  return n;
}

// tira do escritório quem foi removido (a sessão deixa de valer)
function expulsarUtilizador(usuario) {
  const alvo = String(usuario || '').toLowerCase();
  for (const [id, p] of players) {
    if (String(p.usuario || '').toLowerCase() !== alvo) continue;
    try { enviarPara(p, { t: 'expulso', texto: 'Sua conta foi removida.' }); } catch (e) {}
    for (const s of socketsDe(p)) { try { s.close(); } catch (e) {} }
    players.delete(id);
  }
  broadcastEstado();
}

function estadoPublico() {
  return {
    players: [...players.values()].map(p => ({
      id: p.id, name: p.name, x: p.x, y: p.y, cor: p.cor,
      sitting: p.sitting, deskId: p.deskId, muted: p.muted, camOn: p.camOn,
      partilha: !!p.partilha, avatar: p.avatar || null, dir: p.dir || 1,
    })),
    desks: desks.map(d => ({
      id: d.id, label: d.label, x: d.x, y: d.y, w: d.w, h: d.h,
      owner: d.owner, ownerUser: d.ownerUser || '', locked: d.locked, occupied: d.occupied,
      estilo: d.estilo || {},
    })),
  };
}

function broadcastEstado() {
  broadcast({ t: 'estado', ...estadoPublico() });
}

wss.on('connection', (ws) => {
  const sid = Math.random().toString(36).slice(2, 9);   // id do dispositivo
  ws.id = sid;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const p = players.get(ws.jogadorId);

    if (msg.t === 'auth') {
      const dados = auth.verificar(msg.token);
      if (!dados) { enviar(ws, { t: 'auth_erro', texto: 'Sessão inválida. Entre novamente.' }); return; }
      ws.usuario = dados;
      enviar(ws, { t: 'auth_ok', nome: dados.n });
      return;
    }

    if (msg.t === 'entrar') {
      if (!ws.usuario) { enviar(ws, { t: 'auth_erro', texto: 'Você precisa entrar com a sua conta.' }); return; }
      const mesa = desks.find(d => d.owner && d.owner.toLowerCase() === String(ws.usuario.n || '').toLowerCase().trim());

      // mesma conta noutro dispositivo: é o MESMO boneco
      const chaveConta = String(ws.usuario.u || '').toLowerCase();
      for (const q of players.values()) {
        if (!chaveConta || q.usuario !== chaveConta) continue;

        q.sockets.add(ws);
        ws.jogadorId = q.id;
        if (msg.avatar && typeof msg.avatar === 'object') {
          q.avatar = msg.avatar;
          armazem.guardarAvatar(q.usuario, q.avatar).catch(() => {});
        }
        enviar(ws, { t: 'bemvindo', id: q.id, ...estadoPublico() });
        broadcastEstado();
        console.log('mesma conta ligada noutro dispositivo: ' + q.name);
        return;
      }

      const jogador = {
        id: sid,
        ws,
        sockets: new Set([ws]),
        name: String(ws.usuario.n || 'Convidado').slice(0, 24).trim() || 'Convidado',
        x: mesa ? mesa.x + mesa.w / 2 : 800,
        y: mesa ? mesa.y + mesa.h + 40 : 500,
        cor: CORES[players.size % CORES.length],
        sitting: false,
        deskId: null,
        muted: false,
        camOn: true,
        usuario: String(ws.usuario.u || '').toLowerCase(),
        avatar: msg.avatar && typeof msg.avatar === 'object' ? msg.avatar : null,
        dir: 1,
        passo: 0,
      };
      ws.jogadorId = sid;
      players.set(sid, jogador);
      enviar(ws, { t: 'bemvindo', id: sid, ...estadoPublico() });

      if (!jogador.avatar) {
        armazem.lerAvatar(jogador.usuario).then((a) => {
          if (a) { jogador.avatar = a; broadcastEstado(); enviar(ws, { t: 'avatar', avatar: a }); }
        }).catch(() => {});
      } else {
        armazem.guardarAvatar(jogador.usuario, jogador.avatar).catch(() => {});
      }
      broadcast({ t: 'entrou', id: sid, name: jogador.name }, sid);
      broadcastEstado();
      return;
    }

    if (!p) return;
    const id = p.id;   // id do jogador (igual nos vários dispositivos da conta)

    switch (msg.t) {
      case 'mover': {
        p.x = Math.max(0, Math.min(1600, Number(msg.x) || 0));
        p.y = Math.max(0, Math.min(1000, Number(msg.y) || 0));
        broadcast({ t: 'mover', id, x: p.x, y: p.y }, id, { mesmoDono: true, exceptWs: ws });
        break;
      }
      case 'sentar': {
        // assento genérico (poltrona, cadeira da recepção, mesa de reunião...)
        if (msg.spot && typeof msg.spot === 'object') {
          p.sitting = true;
          p.deskId = null;
          p.x = Number(msg.spot.x) || p.x;
          p.y = Number(msg.spot.y) || p.y;
          if (typeof msg.spot.dir === 'number') p.dir = msg.spot.dir;
          broadcastEstado();
          break;
        }

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
        p.y = d.y + 20;   // sentado atrás da mesa: cabeça e ombros acima do tampo
        broadcastEstado();
        break;
      }
      case 'jogoEntrar': {
        const chave = JOGOS[msg.jogo] ? msg.jogo : 'pebolim';
        jogoEntrar(ws, p, id, chave);
        break;
      }
      case 'jogoSair': {
        for (const chave of Object.keys(JOGOS)) {
          if (JOGOS[chave].estado.jogadores.includes(id)) jogoSair(p, id, chave);
        }
        break;
      }
      case 'jogoInput': {
        const chave = JOGOS[msg.jogo] ? msg.jogo : 'pebolim';
        const e = JOGOS[chave].estado;
        const lugar = e.jogadores.indexOf(id);
        if (lugar === -1) return;
        const alvo = Number(msg.y);
        if (!Number.isFinite(alvo)) return;
        e.raquetes[lugar] = Math.max(0.12, Math.min(0.88, alvo));
        break;
      }
      case 'levantar': {
        if (p.deskId) {
          const d = desks.find(x => x.id === p.deskId);
          if (d && d.occupied === id) d.occupied = '';
        }
        p.sitting = false;
        p.deskId = null;
        p.x = Math.max(40, Math.min(1560, p.x));
        p.y = Math.min(960, p.y + 104);  // levanta-se e sai para a frente da mesa
        broadcastEstado();
        break;
      }
      case 'estiloMesa': {
        const d = desks.find(x => x.id === Number(msg.deskId));
        if (!d) return;
        if (!d.owner || d.owner.toLowerCase() !== String(p.name).toLowerCase()) {
          enviar(ws, { t: 'aviso', texto: 'Só o dono da mesa pode mudar o visual dela.' });
          return;
        }

        const permitido = {
          mesa: ['carvalho', 'nogueira', 'branco', 'preto', 'vidro'],
          pc: ['monitor', 'dual', 'portatil', 'torre'],
          cadeira: ['escritorio', 'gamer', 'madeira', 'banco'],
          decor: ['nenhuma', 'planta', 'caneca', 'candeeiro', 'lapis', 'moldura', 'telefone', 'livros'],
          decor2: ['nenhuma', 'planta', 'caneca', 'candeeiro', 'lapis', 'moldura', 'telefone', 'livros'],
        };
        const limpo = {};
        for (const campo of Object.keys(permitido)) {
          const v = msg.estilo && msg.estilo[campo];
          limpo[campo] = permitido[campo].includes(v) ? v : permitido[campo][0];
        }

        d.estilo = limpo;
        guardarMesas();
        broadcast({ t: 'mesa', desk: { ...d } });
        broadcastEstado();
        break;
      }

      case 'fecharMesa': {
        const d = desks.find(x => x.id === msg.deskId);
        if (!d) return;

        // Fechar/abrir NUNCA dá a mesa a ninguém.
        // Só o dono mexe no cadeado. Mesa sem dono nao pode ser trancada.
        if (!d.owner) {
          enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' ainda não é de ninguém. Usa R para ficares com ela.' });
          return;
        }

        const nome = String(msg.nome || p.name).toLowerCase();
        const souDono = d.owner.toLowerCase() === nome || d.owner.toLowerCase() === p.name.toLowerCase();
        if (!souDono) {
          enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' é de ' + d.owner + '.' });
          return;
        }

        d.locked = !d.locked;
        if (!d.locked && d.occupied) {
          // mesa aberta: as autorizacoes deixam de fazer sentido
          for (const chave of [...portas]) {
            if (chave.startsWith(d.occupied + '|') || chave.endsWith('|' + d.occupied)) portas.delete(chave);
          }
        }
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

        // ninguem fica dono de duas mesas
        if (!meuDono) {
          const outra = desks.find(x =>
            x.id !== d.id &&
            x.owner &&
            (x.owner.toLowerCase() === p.name.toLowerCase() || x.owner.toLowerCase() === nome.toLowerCase()));
          if (outra) {
            enviar(ws, { t: 'aviso', texto: 'Você já tem a ' + outra.label + '. Libere-a antes de ficar com outra.' });
            return;
          }
        }

        if (d.owner && !meuDono) {
          enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' já é de ' + d.owner + '.' });
          return;
        }
        d.owner = nome;
        d.ownerUser = p.usuario || '';
        guardarMesas();
        broadcast({ t: 'mesa', desk: { ...d } });
        enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' agora é tua.' });
        break;
      }
      case 'libertarMesa': {
        const d = desks.find(x => x.id === msg.deskId);
        if (!d) return;
        const nome = String(msg.nome || p.name).toLowerCase();
        if (d.owner && d.owner.toLowerCase() !== nome) {
          enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' é de ' + d.owner + '.' });
          return;
        }
        if (d.occupied && d.occupied !== id) {
          enviar(ws, { t: 'aviso', texto: 'Alguém está sentado nessa mesa.' });
          return;
        }
        d.owner = '';
        d.ownerUser = '';
        d.locked = false;
        guardarMesas();
        broadcast({ t: 'mesa', desk: { ...d } });
        enviar(ws, { t: 'aviso', texto: 'A ' + d.label + ' ficou livre.' });
        break;
      }
      case 'bater': {
        const alvoId = String(msg.para || '');
        const alvo = players.get(alvoId);
        if (!alvo) { enviar(ws, { t: 'aviso', texto: 'Essa pessoa já saiu.' }); return; }
        if (alvoId === id) return;

        const mesa = desks.find(x => x.occupied === alvoId && x.locked);
        if (!mesa) { enviar(ws, { t: 'aviso', texto: alvo.name + ' está com a mesa aberta.' }); return; }

        // não deixar encher a pessoa de batidas
        const agora = Date.now();
        if (ultimaBatida.get(id + '|' + alvoId) > agora - 4000) return;
        ultimaBatida.set(id + '|' + alvoId, agora);

        enviarPara(alvo, { t: 'batida', de: id, nome: p.name, mesa: mesa.label, deskId: mesa.id });
        enviar(ws, { t: 'aviso', texto: 'Você bateu à porta de ' + alvo.name + '. À espera de resposta.' });
        break;
      }

      case 'responderBatida': {
        const dono = p;
        const visitanteId = msg.para;
        const visitante = players.get(visitanteId);
        if (!visitante) { enviar(ws, { t: 'aviso', texto: 'Essa pessoa já saiu.' }); return; }

        if (msg.aceitar) {
          portas.add(id + '|' + visitanteId);
          portas.add(visitanteId + '|' + id);
          enviarPara(visitante, { t: 'porta', com: id, aberta: true, nome: dono.name });
          enviar(ws, { t: 'porta', com: visitanteId, aberta: true, nome: visitante.name });
          enviar(ws, { t: 'aviso', texto: 'Você abriu a porta para ' + visitante.name + '.' });
        } else {
          enviarPara(visitante, { t: 'aviso', texto: dono.name + ' não abriu a porta agora.' });
          enviar(ws, { t: 'aviso', texto: 'Você recusou a visita de ' + visitante.name + '.' });
        }
        break;
      }

      case 'fecharPorta': {
        const com = String(msg.com || '');
        portas.delete(id + '|' + com);
        portas.delete(com + '|' + id);
        const outro = players.get(com);
        if (outro) enviarPara(outro, { t: 'porta', com: id, aberta: false });
        enviar(ws, { t: 'porta', com, aberta: false });
        enviar(ws, { t: 'aviso', texto: 'Porta fechada.' });
        break;
      }

      case 'avatar': {
        if (!p) return;
        p.avatar = msg.avatar && typeof msg.avatar === 'object' ? msg.avatar : p.avatar;
        if (p.avatar) armazem.guardarAvatar(p.usuario, p.avatar).catch(() => {});
        broadcastEstado();
        break;
      }

      case 'partilha': {
        p.partilha = !!msg.ligada;
        broadcast({ t: 'estado', ...estadoPublico() });
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
        const texto = String(msg.texto || '').slice(0, 2000).trim();
        const f = msg.ficheiro && msg.ficheiro.url ? {
          url: String(msg.ficheiro.url).slice(0, 300),
          nome: String(msg.ficheiro.nome || 'arquivo').slice(0, 120),
          mime: String(msg.ficheiro.mime || '').slice(0, 100),
          tamanho: Number(msg.ficheiro.tamanho) || 0,
        } : null;

        if (!texto && !f) return;

        const tipo = f ? (f.mime.startsWith('image/') ? 'imagem' : 'arquivo') : 'texto';

        chat.guardar({ autor: p.name, texto, tipo, ficheiro: f })
          .then((m) => {
            broadcast({
              t: 'chat', id: m.id, de: m.autor, cor: p.cor,
              texto: m.texto, ficheiro: m.ficheiro, tipo: m.tipo,
              quando: m.quando, hora: Date.now(),
            });
          })
          .catch((e) => {
            console.log('erro ao salvar mensagem', e.message);
            broadcast({ t: 'chat', de: p.name, cor: p.cor, texto, ficheiro: f, hora: Date.now() });
          });
        break;
      }
      // ---- sinalização WebRTC (vai só para o destinatário)
      case 'sinal': {
        const alvo = players.get(msg.para);
        if (alvo) enviarPara(alvo, { t: 'sinal', de: id, dados: msg.dados });
        break;
      }
    }
  });

  ws.on('close', () => {
    const p = players.get(ws.jogadorId);
    if (!p) return;

    if (p.sockets) p.sockets.delete(ws);
    // a conta ainda está ligada noutro dispositivo: o boneco fica
    if (p.sockets && p.sockets.size > 0) return;

    const id = p.id;
    if (p.deskId) {
      const d = desks.find(x => x.id === p.deskId);
      if (d && d.occupied === id) d.occupied = '';
    }
    for (const chave of [...portas]) {
      if (chave.startsWith(id + '|') || chave.endsWith('|' + id)) portas.delete(chave);
    }
    for (const chave of Object.keys(JOGOS)) {
      const e = JOGOS[chave].estado;
      const lugar = e.jogadores.indexOf(id);
      if (lugar === -1) continue;
      e.jogadores[lugar] = null;
      e.nomes[lugar] = '';
      if (!e.jogadores[0] && !e.jogadores[1]) Object.assign(JOGOS[chave].estado, estadoJogoInicial());
      jogoDifundir(chave);
    }
    players.delete(id);
    broadcast({ t: 'saiu', id });
    broadcastEstado();
  });
});

// ---------------------------------------------------------------- jogos (pebolim e ping-pong)
// Cada mesa tem o seu estado; a física corre no servidor a ~25 Hz.
function estadoJogoInicial() {
  return {
    ativa: false,
    jogadores: [null, null],
    nomes: ['', ''],
    bot: [false, false],
    bola: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
    placar: [0, 0],
    raquetes: [0.5, 0.5],
    pausa: 0,
    saquePara: 0,
    vencedor: null,
    ultimoToque: 0,
  };
}

const JOGOS = {
  pebolim: {
    nome: 'Pebolim', cx: 1280, cy: 892, w: 120, h: 52,
    meiaRaquete: 0.17, vel: 0.62, pontos: 5, entrada: 110,
    onde: { 0: { x: 1190, y: 940 }, 1: { x: 1370, y: 940 } },
    aceitaBot: false,
    estado: estadoJogoInicial(),
  },
  pingpong: {
    nome: 'Ping-pong', cx: 1114, cy: 875, w: 150, h: 44,
    meiaRaquete: 0.13, vel: 0.72, pontos: 7, entrada: 100,
    onde: { 0: { x: 1004, y: 875 }, 1: { x: 1224, y: 875 } },
    aceitaBot: true,
    estado: estadoJogoInicial(),
  },
};

function jogoResumo(chave) {
  const g = JOGOS[chave];
  return { jogo: chave, nome: g.nome, ...g.estado };
}

function jogoDifundir(chave) {
  broadcast({ t: 'jogo', jogo: chave, estado: jogoResumo(chave) });
}

function jogoSaque(chave, contra) {
  const e = JOGOS[chave].estado;
  e.bola = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  e.pausa = 1.0;
  e.saquePara = contra;
}

function jogoEntrar(ws, p, id, chave) {
  const g = JOGOS[chave];
  const e = g.estado;

  let lugar = e.jogadores.indexOf(id);
  if (lugar === -1) lugar = e.bot[0] ? 1 : (e.jogadores[0] === null ? 0 : (e.jogadores[1] === null ? 1 : -1));
  if (lugar === -1) { enviar(ws, { t: 'aviso', texto: g.nome + ': a mesa já está ocupada.' }); return; }

  // se o lugar tinha um bot, o humano toma conta dele
  if (e.bot[lugar]) { e.bot[lugar] = false; }

  e.jogadores[lugar] = id;
  e.nomes[lugar] = p.name;
  e.ativa = true;
  p.sitting = true;
  p.deskId = null;
  p.peca = chave;
  p.x = g.onde[lugar].x;
  p.y = g.onde[lugar].y;
  p.dir = lugar === 0 ? 3 : 2;

  const outro = lugar === 0 ? 1 : 0;
  const soUm = e.jogadores[outro] === null && !e.bot[outro];

  // jogo que já tinha acabado: começa do zero
  if (e.vencedor !== null) {
    e.vencedor = null;
    e.placar = [0, 0];
    e.bola = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    e.raquetes = [0.5, 0.5];
    jogoSaque(chave, lugar === 0 ? 1 : 0);
  }

  if (e.jogadores[0] !== null && (e.jogadores[1] !== null || e.bot[1])) {
    e.vencedor = null;
    e.placar = [0, 0];
    jogoSaque(chave, Math.random() < 0.5 ? 0 : 1);
  } else if (soUm && g.aceitaBot) {
    // sem adversário: entra um robô depois de 2 s
    setTimeout(() => {
      const ee = JOGOS[chave].estado;
      if (ee.jogadores[1] === null && !ee.bot[1] && ee.ativa) {
        ee.bot[1] = true;
        ee.nomes[1] = 'Robô';
        ee.vencedor = null;
        ee.placar = [0, 0];
        jogoSaque(chave, 0);
        jogoDifundir(chave);
      }
    }, 2000);
  }

  broadcastEstado();
  jogoDifundir(chave);
}

function jogoSair(p, id, chave) {
  const e = JOGOS[chave].estado;
  const lugar = e.jogadores.indexOf(id);
  if (lugar === -1) return;
  e.jogadores[lugar] = null;
  e.nomes[lugar] = '';
  p.peca = null;
  p.sitting = false;
  p.y = Math.min(952, p.y + 44);
  if (!e.jogadores[0] && !e.jogadores[1]) {
    Object.assign(JOGOS[chave].estado, estadoJogoInicial());
  }
  broadcastEstado();
  jogoDifundir(chave);
}

function jogoTique(chave, dt) {
  const g = JOGOS[chave];
  const e = g.estado;
  if (!e.ativa) return;
  if (e.vencedor !== null) return;   // jogo terminado: fica congelado

  // robô: segue a bola com velocidade limitada e um pouco de erro
  for (const lado of [0, 1]) {
    if (!e.bot[lado]) continue;
    const avanca = lado === 0 ? e.bola.x < 0.62 : e.bola.x > 0.38;
    const bolaVem = (lado === 0 ? e.bola.vx < 0 : e.bola.vx > 0) && avanca;
    const alvo = bolaVem ? e.bola.y + (Math.random() - 0.5) * 0.07 : 0.5;
    const vel = 0.52 * dt;                     // 0,52 por segundo (batível)
    const dif = alvo - e.raquetes[lado];
    e.raquetes[lado] += Math.max(-vel, Math.min(vel, dif));
    e.raquetes[lado] = Math.max(0.12, Math.min(0.88, e.raquetes[lado]));
  }

  if (e.pausa > 0) {
    e.pausa -= dt;
    if (e.pausa <= 0) {
      const dir = e.saquePara === 1 ? 1 : -1;
      e.bola = { x: 0.5, y: 0.25 + Math.random() * 0.5, vx: dir * g.vel, vy: (Math.random() - 0.5) * 0.42 };
    }
    return;
  }

  const b = e.bola;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.y < 0.07) { b.y = 0.07; b.vy = Math.abs(b.vy); e.ultimoToque = Date.now(); }
  if (b.y > 0.93) { b.y = 0.93; b.vy = -Math.abs(b.vy); e.ultimoToque = Date.now(); }

  const meia = g.meiaRaquete;
  if (b.x < 0.33 && b.x > 0.20 && b.vx < 0) {
    const d = b.y - e.raquetes[0];
    if (Math.abs(d) < meia) {
      b.x = 0.34;
      b.vx = Math.min(1.5, Math.abs(b.vx) * 1.05);
      b.vy = b.vy * 0.55 + d * 1.7;
      e.ultimoToque = Date.now();
      broadcast({ t: 'jogoSom', jogo: chave, som: 'toque' });
    }
  }
  if (b.x > 0.67 && b.x < 0.80 && b.vx > 0) {
    const d = b.y - e.raquetes[1];
    if (Math.abs(d) < meia) {
      b.x = 0.66;
      b.vx = -Math.min(1.5, Math.abs(b.vx) * 1.05);
      b.vy = b.vy * 0.55 + d * 1.7;
      e.ultimoToque = Date.now();
      broadcast({ t: 'jogoSom', jogo: chave, som: 'toque' });
    }
  }

  if (b.x < 0.02) {
    e.placar[1] += 1;
    broadcast({ t: 'jogoSom', jogo: chave, som: 'golo' });
    if (e.placar[1] >= g.pontos) {
      e.vencedor = 1;
      e.placar[1] = g.pontos;
      broadcast({ t: 'jogoSom', jogo: chave, som: 'vitoria' });
      jogoDifundir(chave);
      return;
    }
    jogoSaque(chave, 0);
  } else if (b.x > 0.98) {
    e.placar[0] += 1;
    broadcast({ t: 'jogoSom', jogo: chave, som: 'golo' });
    if (e.placar[0] >= g.pontos) {
      e.vencedor = 0;
      e.placar[0] = g.pontos;
      broadcast({ t: 'jogoSom', jogo: chave, som: 'vitoria' });
      jogoDifundir(chave);
      return;
    }
    jogoSaque(chave, 1);
  }
}

let ultimoTiqueJogos = Date.now();
setInterval(() => {
  const agora = Date.now();
  const dt = Math.min(0.08, (agora - ultimoTiqueJogos) / 1000);
  ultimoTiqueJogos = agora;
  for (const chave of Object.keys(JOGOS)) {
    const antes = JSON.stringify(JOGOS[chave].estado);
    jogoTique(chave, dt);
    if (JSON.stringify(JOGOS[chave].estado) !== antes) jogoDifundir(chave);
  }
}, 40);

// ---------------------------------------------------------------- chat guardado// ---------------------------------------------------------------- chat guardado
chat.iniciar()
  .then((pg) => {
    console.log('mensagens: ' + (pg ? 'Postgres' : 'arquivo local') + ' (7 dias, fixadas para sempre)');
    chat.limparAntigas().catch(() => {});
    setInterval(() => chat.limparAntigas().catch(() => {}), 6 * 3600 * 1000);
  })
  .catch((e) => console.log('mensagens: erro ao iniciar', e.message));

server.listen(PORT, () => {
  console.log('Simmons Office a correr em http://localhost:' + PORT);
});
