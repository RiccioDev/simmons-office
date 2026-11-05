// Simmons Office — cliente
// Mapa 2D, avatares, mesas com fecho, chat e voz/vídeo por proximidade.

const RAIO_CONECTA = 250;   // a partir daqui liga áudio/vídeo
const RAIO_CORTA   = 320;   // a partir daqui desliga (histerese)
const VEL = 4.2;
const RAIO_AVATAR = 16;

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
let ws = null;

// ------------------------------------------------------------ entrada
const nomeInput = document.getElementById('nome');
nomeInput.value = localStorage.getItem('simmons_nome') || '';
nomeInput.focus();

// ?nome=Joao entra direto (util para testar ou para abrir sempre com o mesmo nome)
const paramNome = new URLSearchParams(location.search).get('nome');
if (paramNome) {
  nomeInput.value = paramNome;
  setTimeout(entrar, 120);
}

document.getElementById('btnEntrar').onclick = entrar;
nomeInput.addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });

async function entrar() {
  const nome = nomeInput.value.trim();
  if (!nome) { nomeInput.focus(); return; }
  localStorage.setItem('simmons_nome', nome);

  const semMedia = new URLSearchParams(location.search).get('semmedia');
  if (semMedia) {
    // entra só com texto (sem pedir microfone/câmara)
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
}

// ------------------------------------------------------------ rede
function ligar(nome) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host);

  ws.onopen = () => {
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
    }
  };
}

function aplicarEstado(m) {
  const antes = new Set(players.keys());
  players = new Map(m.players.map(p => [p.id, p]));
  desks = m.desks;
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

  desenhar();
  gerirProximidade();
  posicionarVideos();
  requestAnimationFrame(loop);
}

function resolverColisao(p) {
  for (const d of desks) {
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
  for (const d of desks) {
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
function gerirProximidade() {
  if (!eu || !meuStream) return;
  const p = players.get(eu.id);
  if (!p) return;

  for (const outro of players.values()) {
    if (outro.id === eu.id) continue;
    const dist = Math.hypot(outro.x - p.x, outro.y - p.y);
    const par = pares.get(outro.id);

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
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) fecharPar(id);
  };

  pares.set(id, { pc, videoEl, cardEl });

  if (iniciador) {
    pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => {
      ws.send(JSON.stringify({ t: 'sinal', para: id, dados: { tipo: 'offer', sdp: pc.localDescription } }));
    });
  }
}

async function tratarSinal(de, dados) {
  let par = pares.get(de);

  if (dados.tipo === 'offer') {
    if (!par) { criarPar(de, false); par = pares.get(de); }
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
