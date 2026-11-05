// Simmons Office — cliente
// Mapa 2D, avatares, mesas com fecho, chat e voz/vídeo por proximidade.

const RAIO_CONECTA = 250;   // a partir daqui liga áudio/vídeo
const RAIO_CORTA   = 320;   // a partir daqui desliga (histerese)
const VEL = 4.2;
const RAIO_AVATAR = 16;

function $(id) { return document.getElementById(id); }
function ligarClique(id, evento, fn) { const el = $(id); if (el) el[evento] = fn; }

// ------------------------------------------------------------ som da batida
let audioCtx = null;
let somBatida = localStorage.getItem('som_batida') !== '0';

function contextoAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch (_) { return null; }
}

// o browser só deixa tocar som depois de um gesto; isto "destranca" à primeira tecla
document.addEventListener('pointerdown', () => contextoAudio(), { once: true });
document.addEventListener('keydown', () => contextoAudio(), { once: true });

function tocarBatida() {
  if (!somBatida) return;
  const ctx = contextoAudio();
  if (!ctx) return;

  const agora = ctx.currentTime;
  for (const atraso of [0, 0.30]) {
    const t = agora + atraso;

    // corpo grave: "toc"
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(78, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.18);

    // estalo da madeira
    const amostras = Math.floor(ctx.sampleRate * 0.07);
    const buffer = ctx.createBuffer(1, amostras, ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < amostras; i++) {
      dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / amostras, 7);
    }
    const ruido = ctx.createBufferSource();
    ruido.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1600;
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    ruido.connect(filtro).connect(g2).connect(ctx.destination);
    ruido.start(t);
  }
}

function alternarSino() {
  somBatida = !somBatida;
  localStorage.setItem('som_batida', somBatida ? '1' : '0');
  $('btnSino').classList.toggle('desligado', !somBatida);
  if (somBatida) tocarBatida();
}

let erroMostrado = false;
function relatarErro(origem, e) {
  if (erroMostrado) return;
  erroMostrado = true;
  try {
    sistema('ERRO em ' + origem + ': ' + (e && (e.message || e)) + (e && e.stack ? ' | ' + String(e.stack).split('\n')[1] : ''));
  } catch (_) {
    console.error(origem, e);
  }
}
window.addEventListener('error', (ev) => relatarErro('janela', ev.error || ev.message));

const canvas = document.getElementById('mapa');
const ctx = canvas.getContext('2d');
const LARG = 1600, ALT = 1000;

let eu = null;            // { id, name, cor }
let players = new Map();  // id -> {id,name,x,y,cor,sitting,deskId,muted,camOn}
let desks = [];
let meuStream = null;
let temVideo = false;
let muted = false, camOn = true;

const pares = new Map();  // id -> { pc, videoEl, cardEl }
const portasAbertas = new Set();  // ids autorizados a falar comigo
let batidaPendente = null;
let ws = null;

// ------------------------------------------------------------ entrada
const usuarioInput = document.getElementById('usuario');
const senhaInput = document.getElementById('senha');
let token = localStorage.getItem('simmons_token') || null;
let euAdmin = false;

usuarioInput.value = localStorage.getItem('simmons_usuario') || '';

// link de convite: quem chega por aqui cria a própria conta
const codigoConvite = new URLSearchParams(location.search).get('convite');
if (codigoConvite) {
  fetch('/api/convite?codigo=' + encodeURIComponent(codigoConvite))
    .then(r => r.json())
    .then(d => {
      if (!d.valido) {
        document.getElementById('subPadrao').classList.add('oculto');
        document.getElementById('blocoLogin').classList.add('oculto');
        document.getElementById('blocoSetup').classList.add('oculto');
        document.getElementById('blocoConvite').classList.remove('oculto');
        document.getElementById('btnCriarConvite').disabled = true;
        document.getElementById('erroConvite').textContent = d.erro || 'Convite inválido.';
        return;
      }
      document.getElementById('subPadrao').classList.add('oculto');
      document.getElementById('blocoLogin').classList.add('oculto');
      document.getElementById('blocoSetup').classList.add('oculto');
      document.getElementById('blocoConvite').classList.remove('oculto');
      document.getElementById('convNome').focus();
    })
    .catch(() => {});

  document.getElementById('btnCriarConvite').onclick = async () => {
    const erro = document.getElementById('erroConvite');
    erro.textContent = '';
    const nome = document.getElementById('convNome').value.trim();
    const usuario = document.getElementById('convUsuario').value.trim();
    const senha = document.getElementById('convSenha').value;

    if (!nome || usuario.length < 3 || senha.length < 6) {
      erro.textContent = 'Preenche o nome, um utilizador com 3+ letras e uma senha com 6+.';
      return;
    }

    const r = await fetch('/api/convite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigoConvite, usuario, senha, nome }),
    });
    const d = await r.json();
    if (!r.ok) { erro.textContent = d.erro || 'Não foi possível criar a conta.'; return; }

    token = d.token;
    euAdmin = false;
    localStorage.setItem('simmons_token', token);
    localStorage.setItem('simmons_usuario', usuario);
    history.replaceState({}, '', '/');
    await entrarComSessao();
  };
}

// primeira vez: criar a conta de administrador
fetch('/api/setup').then(r => r.json()).then(d => {
  if (!d.precisa || codigoConvite) return;
  document.getElementById('subPadrao').classList.add('oculto');
  document.getElementById('blocoLogin').classList.add('oculto');
  document.getElementById('blocoSetup').classList.remove('oculto');
  document.getElementById('setupNome').focus();
}).catch(() => {});

document.getElementById('btnCriarAdmin').onclick = async () => {
  const erro = document.getElementById('erroSetup');
  erro.textContent = '';
  const nome = document.getElementById('setupNome').value.trim();
  const usuario = document.getElementById('setupUsuario').value.trim();
  const senha = document.getElementById('setupSenha').value;

  if (!nome || !usuario || senha.length < 6) {
    erro.textContent = 'Preenche tudo e usa uma palavra-passe com 6 ou mais caracteres.';
    return;
  }

  const r = await fetch('/api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, senha, nome }),
  });
  const d = await r.json();

  if (!r.ok) { erro.textContent = d.erro || 'Não foi possível criar.'; return; }

  token = d.token;
  euAdmin = true;
  localStorage.setItem('simmons_token', token);
  localStorage.setItem('simmons_usuario', usuario);
  await entrarComSessao();
};

// sessao guardada: entra direto sem pedir senha outra vez
if (token) {
  fetch('/api/eu', { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d) { euAdmin = !!d.admin; entrarComSessao(); } else { token = null; localStorage.removeItem('simmons_token'); } })
    .catch(() => {});
} else {
  usuarioInput.focus();
}

document.getElementById('btnEntrar').onclick = entrar;
senhaInput.addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
usuarioInput.addEventListener('keydown', e => { if (e.key === 'Enter') senhaInput.focus(); });

async function entrar() {
  const erro = document.getElementById('erroLogin');
  erro.textContent = '';
  const usuario = usuarioInput.value.trim();
  const senha = senhaInput.value;

  if (!usuario || !senha) { erro.textContent = 'Escreve o utilizador e a palavra-passe.'; return; }

  const btn = document.getElementById('btnEntrar');
  btn.disabled = true;
  btn.textContent = 'A entrar...';

  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    });
    const d = await r.json();
    if (!r.ok) {
      erro.textContent = d.erro || 'Não foi possível entrar.';
      btn.disabled = false; btn.textContent = 'Entrar no escritório';
      return;
    }
    token = d.token;
    euAdmin = !!d.admin;
    localStorage.setItem('simmons_token', token);
    localStorage.setItem('simmons_usuario', usuario);
    btn.disabled = false; btn.textContent = 'Entrar no escritório';
    await entrarComSessao();
  } catch (e) {
    erro.textContent = 'Sem ligação ao servidor.';
    btn.disabled = false; btn.textContent = 'Entrar no escritório';
  }
}

// chamado depois do login ou quando ja havia sessao guardada
async function entrarComSessao() {
  const semMedia = new URLSearchParams(location.search).get('semmedia');
  const dadosSessao = await fetch('/api/eu', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()).catch(() => ({}));
  const nome = dadosSessao.nome || usuarioInput.value.trim() || 'Convidado';

  if (semMedia) {
    document.getElementById('entrada').classList.add('oculto');
    document.getElementById('app').classList.remove('oculto');
    ligar(nome);
    return;
  }

  try {
    meuStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 640, height: 480 }
    });
    temVideo = true;
  } catch (e) {
    try {
      meuStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      temVideo = false;
    } catch (e2) {
      meuStream = null;
      alert('Sem acesso ao microfone. Podes entrar, mas só vais poder escrever.');
    }
  }

  document.getElementById('entrada').classList.add('oculto');
  document.getElementById('app').classList.remove('oculto');
  ligar(nome);

  if (euAdmin) document.getElementById('btnAdmin').classList.remove('oculto');
  montarAutoVista();
}

// ------------------------------------------------------------ a minha camara
function montarAutoVista() {
  if (!meuStream || !temVideo) return;
  const v = document.getElementById('autoVideo');
  v.srcObject = meuStream;
  v.muted = true;
  v.play().catch(() => {});
  document.getElementById('autoVista').classList.remove('oculto');
  atualizarSala();
}

// ------------------------------------------------------------ rede
function ligar(nome) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host);

  ws.onopen = () => {
    ws.send(JSON.stringify({ t: 'auth', token }));
    ws.send(JSON.stringify({ t: 'entrar', name: nome }));
    document.getElementById('estadoLigacao').classList.add('on');
  };

  ws.onclose = () => {
    document.getElementById('estadoLigacao').classList.remove('on');
    sistema('Ligação perdida. Recarrega a página.');
  };

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    switch (m.t) {
      case 'bemvindo':
        eu = { id: m.id, name: nome, cor: '#c9a227' };
        aplicarEstado(m);
        if (meuStream) {
          const p = players.get(m.id);
          if (p) p.cor = m.players.find(x => x.id === m.id)?.cor || '#c9a227';
        }
        sistema('Estás no escritório. Anda com WASD e chega-te a alguém para falar.');
        break;
      case 'estado':
        aplicarEstado(m);
        break;
      case 'mover': {
        const p = players.get(m.id);
        if (p) { p.x = m.x; p.y = m.y; }
        break;
      }
      case 'player': {
        const p = players.get(m.id);
        if (p) {
          if (typeof m.muted === 'boolean') p.muted = m.muted;
          if (typeof m.camOn === 'boolean') p.camOn = m.camOn;
        }
        break;
      }
      case 'mesa': {
        const i = desks.findIndex(d => d.id === m.desk.id);
        if (i >= 0) desks[i] = m.desk;
        break;
      }
      case 'chat':
        bolha(m.de, m.cor, m.texto, m.hora);
        break;
      case 'sistema':
        sistema(m.texto);
        break;
      case 'aviso':
        avisar(m.texto);
        break;
      case 'entrou':
        sistema(m.name + ' entrou.');
        break;
      case 'saiu':
        sistema((players.get(m.id)?.name || 'Alguém') + ' saiu.');
        break;
      case 'sinal':
        tratarSinal(m.de, m.dados);
        break;
      case 'batida': {
        batidaPendente = m;
        const iniciais = (m.nome || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
        document.getElementById('batidaAvatar').textContent = iniciais;
        document.getElementById('batidaTexto').innerHTML =
          '<b>' + escapar(m.nome) + '</b> está à porta da <b>' + escapar(m.mesa) + '</b>.';
        document.getElementById('modalBatida').classList.remove('oculto');

        tocarBatida();
        marcarTitulo(m.nome);
        break;
      }
      case 'porta': {
        if (m.aberta) {
          portasAbertas.add(m.com);
          avisar('Porta aberta com ' + (m.nome || 'o colega') + '.');
        } else {
          portasAbertas.delete(m.com);
          fecharPar(m.com);
        }
        break;
      }
      case 'auth_erro':
        localStorage.removeItem('simmons_token');
        location.reload();
        break;
    }
  };
}

let avisouMesas = false;

function aplicarEstado(m) {
  const antes = new Set(players.keys());

  if (Array.isArray(m.players)) {
    players = new Map(m.players.map(p => [p.id, p]));
  }
  if (Array.isArray(m.desks) && m.desks.length) {
    desks = m.desks;
    avisouMesas = false;
  } else if (!desks.length && !avisouMesas) {
    avisouMesas = true;
    sistema('O servidor não enviou as mesas. Recarrega com F5.');
  }

  for (const id of antes) if (!players.has(id)) fecharPar(id);
  document.getElementById('contagem').textContent = players.size + ' online';
}

// ------------------------------------------------------------ mensagens
function bolha(de, cor, texto, hora) {
  const chat = document.getElementById('chat');
  const d = new Date(hora || Date.now());
  const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const el = document.createElement('div');
  el.className = 'msg';
  el.innerHTML = `<b style="color:${cor}">${escapar(de)}</b><span class="hora">${hh}</span><br>${escapar(texto)}`;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}
function sistema(texto) {
  const chat = document.getElementById('chat');
  const el = document.createElement('div');
  el.className = 'msg sistema';
  el.textContent = texto;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}
function avisar(texto) {
  const a = document.getElementById('aviso');
  a.textContent = texto;
  a.classList.add('on');
  clearTimeout(a._t);
  a._t = setTimeout(() => a.classList.remove('on'), 2600);
}
function escapar(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.getElementById('formChat').addEventListener('submit', e => {
  e.preventDefault();
  const inp = document.getElementById('msg');
  const t = inp.value.trim();
  if (!t || !ws) return;
  ws.send(JSON.stringify({ t: 'chat', texto: t }));
  inp.value = '';
});

// ------------------------------------------------------------ teclado
const teclas = new Set();
window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  teclas.add(k);

  if (k === 'e') alternarSentar();
  if (k === 'l') alternarFecho();
  if (k === 'r') reclamarMesa();
  if (k === 'k') bater();
  if (k === 'm') alternarMic();
  if (k === 'c') alternarCam();

  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => teclas.delete(e.key.toLowerCase()));

function minhaMesaMaisProxima() {
  const p = players.get(eu?.id);
  if (!p) return null;
  let melhor = null, dist = 1e9;
  for (const d of desks) {
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    const dist2 = Math.hypot(cx - p.x, cy - p.y);
    if (dist2 < dist) { dist = dist2; melhor = d; }
  }
  return dist < 150 ? melhor : null;
}

function alternarSentar() {
  if (!eu) return;
  const p = players.get(eu.id);
  if (!p) return;
  if (p.sitting) { ws.send(JSON.stringify({ t: 'levantar' })); return; }
  const d = minhaMesaMaisProxima();
  if (!d) { avisar('Chega-te a uma mesa para te sentares.'); return; }
  ws.send(JSON.stringify({ t: 'sentar', deskId: d.id, nome: eu.name }));
}

function alternarFecho() {
  const d = minhaMesaMaisProxima();
  if (!d) { avisar('Chega-te a uma mesa.'); return; }
  if (d.owner && d.owner.toLowerCase() !== eu.name.toLowerCase()) {
    avisar('Esta mesa é de ' + d.owner + '.');
    return;
  }
  ws.send(JSON.stringify({ t: 'fecharMesa', deskId: d.id, nome: eu.name }));
}

let mesaEmClaim = null;

function reclamarMesa() {
  const d = minhaMesaMaisProxima();
  if (!d) { avisar('Chega-te a uma mesa.'); return; }
  if (d.owner && d.owner.toLowerCase() !== (eu?.name || '').toLowerCase()) {
    avisar('A ' + d.label + ' já é de ' + d.owner + '.');
    return;
  }
  mesaEmClaim = d;
  const inp = document.getElementById('nomeMesa');
  inp.value = d.owner || eu?.name || '';
  const btnLibertar = document.getElementById('btnLibertar');
  btnLibertar.classList.toggle('oculto', !d.owner);
  document.getElementById('modalMesa').classList.remove('oculto');
  setTimeout(() => { inp.focus(); inp.select(); }, 60);
}

function fecharModalMesa() {
  document.getElementById('modalMesa').classList.add('oculto');
  mesaEmClaim = null;
}

document.getElementById('btnCancelarMesa').onclick = fecharModalMesa;

document.getElementById('btnLibertar').onclick = () => {
  if (!mesaEmClaim) { fecharModalMesa(); return; }
  ws.send(JSON.stringify({ t: 'libertarMesa', deskId: mesaEmClaim.id, nome: eu.name }));
  fecharModalMesa();
};

document.getElementById('btnConfirmarMesa').onclick = () => {
  const nome = document.getElementById('nomeMesa').value.trim();
  if (!nome || !mesaEmClaim) { fecharModalMesa(); return; }
  ws.send(JSON.stringify({ t: 'reclamarMesa', deskId: mesaEmClaim.id, nome }));
  fecharModalMesa();
};

document.getElementById('nomeMesa').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btnConfirmarMesa').click();
  if (e.key === 'Escape') fecharModalMesa();
});

// quem esta perto e esta sentado numa mesa trancada
function vizinhoFechado() {
  const euJogador = players.get(eu?.id);
  if (!euJogador) return null;
  let melhor = null, dist = 1e9;
  for (const o of players.values()) {
    if (o.id === eu.id) continue;
    if (!estaBloqueado(o)) continue;
    const d2 = Math.hypot(o.x - euJogador.x, o.y - euJogador.y);
    if (d2 < dist) { dist = d2; melhor = o; }
  }
  return dist < RAIO_CONECTA ? melhor : null;
}

let tituloOriginal = document.title;
let piscaTitulo = null;

function marcarTitulo(nome) {
  if (piscaTitulo) return;
  let visivel = true;
  piscaTitulo = setInterval(() => {
    document.title = visivel ? '🔔 ' + nome + ' está à porta' : tituloOriginal;
    visivel = !visivel;
  }, 900);
  document.title = '🔔 ' + nome + ' está à porta';
}

function limparTitulo() {
  if (piscaTitulo) { clearInterval(piscaTitulo); piscaTitulo = null; }
  document.title = tituloOriginal;
}

function bater() {
  const alvo = vizinhoFechado();
  if (!alvo) { avisar('Não há ninguém de porta fechada aqui perto.'); return; }
  ws.send(JSON.stringify({ t: 'bater', para: alvo.id }));
}

document.getElementById('btnAceitarBatida').onclick = () => {
  if (!batidaPendente) return;
  ws.send(JSON.stringify({ t: 'responderBatida', para: batidaPendente.de, aceitar: true }));
  portasAbertas.add(batidaPendente.de);
  document.getElementById('modalBatida').classList.add('oculto');
  batidaPendente = null;
  document.getElementById('modalBatida').classList.add('oculto');
  limparTitulo();
};

document.getElementById('btnRecusarBatida').onclick = () => {
  if (!batidaPendente) return;
  ws.send(JSON.stringify({ t: 'responderBatida', para: batidaPendente.de, aceitar: false }));
  batidaPendente = null;
  document.getElementById('modalBatida').classList.add('oculto');
  limparTitulo();
};

function alternarMic() {
  if (!meuStream) return;
  muted = !muted;
  meuStream.getAudioTracks().forEach(t => t.enabled = !muted);
  ws.send(JSON.stringify({ t: 'mic', muted }));
  document.getElementById('btnSom').classList.toggle('desligado', muted);
}

function alternarCam() {
  if (!meuStream || !temVideo) return;
  camOn = !camOn;
  meuStream.getVideoTracks().forEach(t => t.enabled = camOn);
  ws.send(JSON.stringify({ t: 'cam', camOn }));
  document.getElementById('btnCam').classList.toggle('desligado', !camOn);
  document.getElementById('autoVista').classList.toggle('oculto', !camOn || !temVideo);
  atualizarSala();
}
document.getElementById('btnSom').onclick = alternarMic;
document.getElementById('btnCam').onclick = alternarCam;

// ------------------------------------------------------------ loop
let ultimoEnvio = 0;

function loop(t) {
  const p = players.get(eu?.id);

  if (p && !p.sitting) {
    let dx = 0, dy = 0;
    if (teclas.has('w') || teclas.has('arrowup')) dy -= 1;
    if (teclas.has('s') || teclas.has('arrowdown')) dy += 1;
    if (teclas.has('a') || teclas.has('arrowleft')) dx -= 1;
    if (teclas.has('d') || teclas.has('arrowright')) dx += 1;
    if (dx || dy) {
      const n = Math.hypot(dx, dy);
      const nx = p.x + (dx / n) * VEL;
      const ny = p.y + (dy / n) * VEL;
      p.x = Math.max(RAIO_AVATAR + 10, Math.min(LARG - RAIO_AVATAR - 10, nx));
      p.y = Math.max(RAIO_AVATAR + 10, Math.min(ALT - RAIO_AVATAR - 10, ny));
      resolverColisao(p);
      if (t - ultimoEnvio > 45) {
        ws.send(JSON.stringify({ t: 'mover', x: p.x, y: p.y }));
        ultimoEnvio = t;
      }
    }
  }

  try { desenhar(); } catch (e) { relatarErro('desenho', e); }
  try { gerirProximidade(); posicionarVideos(); } catch (e) { relatarErro('proximidade', e); }

  if (batidaPendente && !players.has(batidaPendente.de)) {
    batidaPendente = null;
    const md = $('modalBatida');
    if (md) md.classList.add('oculto');
    limparTitulo();
  }
  requestAnimationFrame(loop);
}
  // ------------------------------------------------------------ sala (modo reuniao)
let salaAberta = false;

function participantes() {
  const lista = [];
  if (eu && meuStream && temVideo && camOn) {
    lista.push({ id: eu.id, nome: eu.name + ' (tu)', stream: meuStream, eu: true });
  }
  for (const [id, par] of pares) {
    const p = players.get(id);
    if (!p) continue;
    lista.push({ id, nome: p.name, stream: par.videoEl.srcObject || null, eu: false });
  }
  return lista;
}

function atualizarBottaoSala() {
  const btn = document.getElementById('btnSala');
  const tem = pares.size > 0;
  btn.classList.toggle('oculto', !tem || salaAberta);
  if (!tem && salaAberta) fecharSala();
}

function atualizarSala() {
  atualizarBottaoSala();
  if (!salaAberta) return;

  const grelha = document.getElementById('salaGrelha');
  const lista = participantes();

  // quantos para definir o tamanho das celulas
  grelha.style.gridTemplateColumns = lista.length <= 1 ? '1fr'
    : lista.length === 2 ? '1fr 1fr'
    : 'repeat(2, 1fr)';

  const idsAtuais = new Set(lista.map(p => p.id));
  for (const el of [...grelha.children]) {
    if (!idsAtuais.has(el.dataset.id)) el.remove();
  }

  for (const pessoa of lista) {
    let tile = grelha.querySelector('[data-id="' + pessoa.id + '"]');
    if (!tile) {
      tile = document.createElement('div');
      tile.className = 'tile' + (pessoa.eu ? ' eu' : '');
      tile.dataset.id = pessoa.id;

      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.muted = !!pessoa.eu;

      const sem = document.createElement('div');
      sem.className = 'semimagem';
      sem.textContent = pessoa.nome ? pessoa.nome[0].toUpperCase() : '?';

      const nome = document.createElement('div');
      nome.className = 'nome';
      nome.textContent = pessoa.nome;

      tile.append(v, sem, nome);
      grelha.appendChild(tile);
    }

    const video = tile.querySelector('video');
    const sem = tile.querySelector('.semimagem');
    if (pessoa.stream) {
      if (video.srcObject !== pessoa.stream) {
        video.srcObject = pessoa.stream;
        video.play().catch(() => {});
      }
      sem.style.display = 'none';
    } else {
      sem.style.display = 'grid';
    }
  }

  document.getElementById('salaTitulo').textContent =
    lista.length <= 1 ? 'A tua câmara' : 'Reunião · ' + lista.length + ' pessoas';
}

function abrirSala() {
  if (!pares.size) return;
  salaAberta = true;
  const sala = document.getElementById('sala');
  sala.classList.remove('oculto');
  document.getElementById('btnSala').classList.add('oculto');
  atualizarSala();
  if (sala.requestFullscreen) sala.requestFullscreen().catch(() => {});
}

function fecharSala() {
  salaAberta = false;
  const sala = document.getElementById('sala');
  sala.classList.add('oculto');
  document.getElementById('salaGrelha').innerHTML = '';
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  atualizarBottaoSala();
}

if ($('btnSino')) $('btnSino').classList.toggle('desligado', !somBatida);
ligarClique('btnSino', 'onclick', alternarSino);
ligarClique('btnSala', 'onclick', abrirSala);
ligarClique('btnSairSala', 'onclick', fecharSala);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && salaAberta) fecharSala();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && salaAberta) fecharSala();
});

// ------------------------------------------------------------ contas (admin)
const modalContas = document.getElementById('modalContas');


ligarClique('btnAdmin', 'onclick', async () => {
  if (!modalContas) return;
  modalContas.classList.remove('oculto');
  await carregarContas();
  await carregarConvites();
});

ligarClique('btnFecharContas', 'onclick', () => {
  if (!modalContas) return;
  modalContas.classList.add('oculto');
  const r = $('resultadoConta'); if (r) r.textContent = '';
});

ligarClique('btnGerarConvite', 'onclick', async () => {
  const caixa = document.getElementById('linkConvite');
  const r = await fetch('/api/convites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ dias: 7 }),
  });
  const d = await r.json();
  if (!r.ok) { caixa.textContent = d.erro || 'erro ao gerar'; caixa.classList.remove('oculto'); return; }

  const link = location.origin + '/?convite=' + d.codigo;
  caixa.innerHTML = '<div class="linkTexto">' + escapar(link) + '</div>' +
    '<button id="btnCopiarLink">Copiar link</button>' +
    '<small>Válido até ' + new Date(d.expira).toLocaleDateString('pt-PT') + '</small>';
  caixa.classList.remove('oculto');

  document.getElementById('btnCopiarLink').onclick = () => {
    navigator.clipboard.writeText(link).then(() => {
      document.getElementById('btnCopiarLink').textContent = 'Copiado!';
      setTimeout(() => { const b = document.getElementById('btnCopiarLink'); if (b) b.textContent = 'Copiar link'; }, 1600);
    }).catch(() => {});
  };

  await carregarConvites();
});

async function carregarConvites() {
  const lista = document.getElementById('listaConvites');
  try {
    const r = await fetch('/api/convites', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (!r.ok) { lista.innerHTML = ''; return; }
    if (!d.convites.length) { lista.innerHTML = '<div class="contaVazia">Ainda não geraste convites.</div>'; return; }

    lista.innerHTML = d.convites.map(c => {
      const expirado = new Date(c.expira) < new Date();
      const estado = c.usado ? ('usado por ' + escapar(c.usado_por || '?')) : (expirado ? 'expirado' : 'por usar');
      const cor = c.usado ? '#5f6875' : (expirado ? '#c98a7a' : '#8fe3d6');
      return '<div class="contaLinha">' +
        '<span class="contaNome">' + escapar(c.codigo.slice(0, 10)) + '…' +
        '<small>' + new Date(c.criado).toLocaleDateString('pt-PT') + ' · <b style="color:' + cor + '">' + estado + '</b></small></span>' +
        '<button class="contaRemover" data-c="' + escapar(c.codigo) + '">apagar</button></div>';
    }).join('');

    lista.querySelectorAll('.contaRemover').forEach(b => {
      b.onclick = async () => {
        await fetch('/api/convites/remover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ codigo: b.dataset.c }),
        });
        await carregarConvites();
      };
    });
  } catch (e) {
    lista.innerHTML = '';
  }
}

async function carregarContas() {
  const lista = document.getElementById('listaContas');
  lista.innerHTML = '<div class="contaVazia">A carregar...</div>';
  try {
    const r = await fetch('/api/usuarios', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (!r.ok) { lista.innerHTML = '<div class="contaVazia">' + escapar(d.erro || 'erro') + '</div>'; return; }
    if (!d.usuarios.length) { lista.innerHTML = '<div class="contaVazia">Ainda não há contas.</div>'; return; }
    lista.innerHTML = d.usuarios.map(u => `
      <div class="contaLinha">
        <span class="contaNome">${escapar(u.display_name)}<small>${escapar(u.username)}${u.is_admin ? ' · admin' : ''}</small></span>
        <button class="contaRemover" data-u="${escapar(u.username)}">remover</button>
      </div>`).join('');

    lista.querySelectorAll('.contaRemover').forEach(b => {
      b.onclick = async () => {
        if (!confirm('Remover a conta ' + b.dataset.u + '?')) return;
        await fetch('/api/usuarios/remover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ usuario: b.dataset.u }),
        });
        await carregarContas();
      };
    });
  } catch (e) {
    lista.innerHTML = '<div class="contaVazia">Sem ligação.</div>';
  }
}

ligarClique('btnCriarConta', 'onclick', async () => {
  const usuario = document.getElementById('novoUsuario').value.trim();
  const nome = document.getElementById('novoNome').value.trim();
  const res = document.getElementById('resultadoConta');
  if (!usuario || !nome) { res.textContent = 'Preenche o utilizador e o nome.'; return; }

  const r = await fetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ usuario, nome }),
  });
  const d = await r.json();

  if (!r.ok) { res.textContent = d.erro || 'Não foi possível criar.'; return; }

  res.innerHTML = 'Conta criada: <b>' + escapar(d.usuario) + '</b> · palavra-passe: <b>' + escapar(d.senha) + '</b><br><small>Guarda e envia ao colega. Ele pode mudar depois.</small>';
  const nu = $('novoUsuario'); if (nu) nu.value = '';
  const nn = $('novoNome'); if (nn) nn.value = '';
  await carregarContas();
});




function resolverColisao(p) {
  for (const d of (Array.isArray(desks) ? desks : [])) {
    const pertoX = Math.max(d.x, Math.min(p.x, d.x + d.w));
    const pertoY = Math.max(d.y, Math.min(p.y, d.y + d.h));
    const dx = p.x - pertoX, dy = p.y - pertoY;
    const dist = Math.hypot(dx, dy);
    if (dist < RAIO_AVATAR && dist > 0) {
      p.x += (dx / dist) * (RAIO_AVATAR - dist);
      p.y += (dy / dist) * (RAIO_AVATAR - dist);
    }
  }
}

// ------------------------------------------------------------ desenho
function desenhar() {
  ctx.clearRect(0, 0, LARG, ALT);

  // chão
  ctx.fillStyle = '#11161d';
  ctx.fillRect(0, 0, LARG, ALT);

  // grade suave
  ctx.strokeStyle = 'rgba(255,255,255,.022)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= LARG; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALT); ctx.stroke();
  }
  for (let y = 0; y <= ALT; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LARG, y); ctx.stroke();
  }

  // tapete central
  ctx.fillStyle = 'rgba(201,162,39,.045)';
  ctx.beginPath();
  ctx.roundRect(80, 110, 1440, 780, 26);
  ctx.fill();

  // mesas
  for (const d of (Array.isArray(desks) ? desks : [])) {
    const minha = eu && d.owner && d.owner.toLowerCase() === eu.name.toLowerCase();
    const ocupada = !!d.occupied;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = d.locked ? '#2b2118' : (minha ? '#1e2a33' : '#1a2129');
    ctx.beginPath();
    ctx.roundRect(d.x, d.y, d.w, d.h, 12);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = d.locked ? '#c26a3a' : (minha ? '#c9a227' : '#2b3542');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(d.x, d.y, d.w, d.h, 12);
    ctx.stroke();

    // tampo
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath();
    ctx.roundRect(d.x + 10, d.y + 10, d.w - 20, 26, 7);
    ctx.fill();

    ctx.fillStyle = ocupada ? '#8fe3d6' : '#7b8593';
    ctx.font = '600 13px "Segoe UI",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(d.label, d.x + 12, d.y + 30);

    // dono e cadeado
    const donoTxt = d.owner || 'livre';
    ctx.fillStyle = d.owner ? '#5f6875' : '#3f4753';
    ctx.font = '11px "Segoe UI",sans-serif';
    ctx.fillText(donoTxt.slice(0, 22), d.x + 12, d.y + 52);

    ctx.textAlign = 'right';
    ctx.font = '15px "Segoe UI Emoji",sans-serif';
    ctx.fillStyle = d.locked ? '#e08b57' : '#4b545f';
    ctx.fillText(d.locked ? '🔒' : '🔓', d.x + d.w - 14, d.y + 34);

    if (d.locked && d.occupied) {
      ctx.fillStyle = 'rgba(232,168,90,.9)';
      ctx.font = '600 11px "Segoe UI",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('porta fechada · K para bater', d.x + 12, d.y + d.h - 10);
      ctx.textAlign = 'left';
    }

    if (d.locked && d.occupied) {
      ctx.fillStyle = 'rgba(194,106,58,.14)';
      ctx.beginPath();
      ctx.roundRect(d.x, d.y, d.w, d.h, 12);
      ctx.fill();
    }
  }

  // jogadores
  for (const p of players.values()) {
    const souEu = eu && p.id === eu.id;

    // halo de proximidade
    if (souEu) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, RAIO_CONECTA, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,162,39,.045)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,39,.14)';
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, RAIO_AVATAR, 0, Math.PI * 2);
    ctx.fillStyle = p.cor || '#888';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = souEu ? '#fff' : 'rgba(0,0,0,.45)';
    ctx.stroke();

    // inicial
    ctx.fillStyle = '#12151a';
    ctx.font = '700 14px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((p.name || '?')[0].toUpperCase(), p.x, p.y + 1);

    // nome
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 12.5px "Segoe UI",sans-serif';
    const largura = ctx.measureText(p.name).width;
    ctx.fillStyle = 'rgba(10,13,18,.8)';
    ctx.beginPath();
    ctx.roundRect(p.x - largura / 2 - 7, p.y + RAIO_AVATAR + 5, largura + 14, 20, 6);
    ctx.fill();
    ctx.fillStyle = souEu ? '#c9a227' : '#cfd6df';
    ctx.fillText(p.name, p.x, p.y + RAIO_AVATAR + 19);

    if (p.muted) {
      ctx.font = '11px "Segoe UI Emoji",sans-serif';
      ctx.fillText('🔇', p.x + RAIO_AVATAR - 2, p.y - RAIO_AVATAR + 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

// ------------------------------------------------------------ proximidade / WebRTC
// alguem sentado numa mesa trancada esta "dentro da sala": so fala com quem abriu a porta
function estaBloqueado(jogador) {
  if (!jogador || !jogador.sitting || !jogador.deskId) return false;
  const d = desks.find(x => x.id === jogador.deskId);
  return !!(d && d.locked);
}

function gerirProximidade() {
  if (!eu || !meuStream) return;
  const p = players.get(eu.id);
  if (!p) return;

  const euBloqueado = estaBloqueado(p);

  for (const outro of players.values()) {
    if (outro.id === eu.id) continue;
    const dist = Math.hypot(outro.x - p.x, outro.y - p.y);
    const par = pares.get(outro.id);

    const bloqueado = (estaBloqueado(outro) || euBloqueado) && !portasAbertas.has(outro.id);

    if (bloqueado) {
      if (par) fecharPar(outro.id);
      continue;
    }

    if (dist < RAIO_CONECTA && !par) {
      // só o de id menor inicia, para não haver oferta dupla
      criarPar(outro.id, eu.id < outro.id);
    } else if (dist > RAIO_CORTA && par) {
      fecharPar(outro.id);
    }
  }
}

function criarPar(id, iniciador) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 4,
  });

  const videoEl = document.createElement('video');
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = false;

  const cardEl = document.createElement('div');
  cardEl.className = 'videoCard';
  const inicial = document.createElement('div');
  inicial.className = 'inicial';
  inicial.textContent = (players.get(id)?.name || '?')[0].toUpperCase();
  const etiqueta = document.createElement('div');
  etiqueta.className = 'etiqueta';
  etiqueta.textContent = players.get(id)?.name || 'Convidado';
  cardEl.appendChild(inicial);
  cardEl.appendChild(videoEl);
  cardEl.appendChild(etiqueta);
  document.getElementById('videoZone').appendChild(cardEl);

  if (meuStream) meuStream.getTracks().forEach(t => pc.addTrack(t, meuStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) ws.send(JSON.stringify({ t: 'sinal', para: id, dados: { tipo: 'ice', candidate: e.candidate } }));
  };

  pc.ontrack = (e) => {
    videoEl.srcObject = e.streams[0];
    cardEl.classList.remove('semcam');
    atualizarSala();
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) fecharPar(id);
  };

  pares.set(id, { pc, videoEl, cardEl });
  atualizarSala();

  // rede de segurança: se em 2 s continuar "new", oferece de qualquer forma
  setTimeout(() => {
    const atual = pares.get(id);
    if (!atual || atual.pc !== pc) return;
    if (pc.connectionState === 'new' && pc.signalingState === 'stable') {
      ofertar(id, pc);
    }
  }, 2000);

  if (iniciador) ofertar(id, pc);
}

function ofertar(id, pc) {
  if (pc.signalingState !== 'stable') return;
  pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => {
    ws.send(JSON.stringify({ t: 'sinal', para: id, dados: { tipo: 'offer', sdp: pc.localDescription } }));
  }).catch(() => {});
}

async function tratarSinal(de, dados) {
  let par = pares.get(de);

  if (dados.tipo === 'offer') {
    if (!par) { criarPar(de, false); par = pares.get(de); }
    if (par.pc.signalingState !== 'stable') return;
    await par.pc.setRemoteDescription(new RTCSessionDescription(dados.sdp));
    const resposta = await par.pc.createAnswer();
    await par.pc.setLocalDescription(resposta);
    ws.send(JSON.stringify({ t: 'sinal', para: de, dados: { tipo: 'answer', sdp: par.pc.localDescription } }));
  } else if (dados.tipo === 'answer' && par) {
    if (par.pc.signalingState !== 'stable') {
      await par.pc.setRemoteDescription(new RTCSessionDescription(dados.sdp));
    }
  } else if (dados.tipo === 'ice' && par) {
    try { await par.pc.addIceCandidate(new RTCIceCandidate(dados.candidate)); } catch (e) { }
  }
}

function fecharPar(id) {
  const par = pares.get(id);
  if (!par) return;
  try { par.pc.close(); } catch (e) { }
  par.cardEl.remove();
  pares.delete(id);
  atualizarSala();
}

// ------------------------------------------------------------ vídeos no ecrã
function posicionarVideos() {
  const rect = canvas.getBoundingClientRect();
  const eX = rect.width / LARG;
  const eY = rect.height / ALT;

  for (const [id, par] of pares) {
    const p = players.get(id);
    if (!p) { par.cardEl.style.opacity = '0'; continue; }
    par.cardEl.style.opacity = '1';
    par.cardEl.style.left = (rect.left + p.x * eX) + 'px';
    par.cardEl.style.top = (rect.top + (p.y - RAIO_AVATAR - 26) * eY) + 'px';
    par.cardEl.classList.toggle('semcam', !p.camOn);
  }
}

requestAnimationFrame(loop);
