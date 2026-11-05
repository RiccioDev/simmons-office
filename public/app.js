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

// uma campainha: dois toques curtos, tipo campainha de porta
function tocarToque(ctx, quando, volume) {
  const notas = [[880, 0], [660, 0.20]];
  for (const [freq, atraso] of notas) {
    const t = quando + atraso;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(volume * 0.55, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.26);

    // harmonico fraco: dá corpo de campainha em vez de apito de microondas
    const h = ctx.createOscillator();
    const gh = ctx.createGain();
    h.type = 'sine';
    h.frequency.setValueAtTime(freq * 2, t);
    gh.gain.setValueAtTime(0.0001, t);
    gh.gain.exponentialRampToValueAtTime(volume * 0.28, t + 0.015);
    gh.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    h.connect(gh).connect(ctx.destination);
    h.start(t); h.stop(t + 0.18);
  }
}

// ciclo da campainha: toca ~5 s, cala 20 s, repete, ate ser atendida/recusada
const CAMPainha_TOQUE = 1300;   // ms entre toques dentro de uma rajada
const CAMPainha_DURACAO = 5000; // ms que a rajada dura
const CAMPainha_PAUSA = 20000;  // ms de silencio entre rajadas

let cicloCampainha = null;
let rajadaCampainha = null;

function comecarCampainha(nome) {
  pararCampainha();
  if (!somBatida) return;

  const tocarRajada = () => {
    const ctx = contextoAudio();
    if (!ctx) return;
    const inicio = ctx.currentTime + 0.03;
    let i = 0;
    const quantos = Math.floor(CAMPainha_DURACAO / CAMPainha_TOQUE);

    rajadaCampainha = setInterval(() => {
      if (i >= quantos) { clearInterval(rajadaCampainha); rajadaCampainha = null; return; }
      tocarToque(ctx, Math.max(ctx.currentTime, inicio) + 0.02, 0.32);
      marcarTitulo(nome);
      i++;
    }, CAMPainha_TOQUE);
  };

  tocarRajada();
  cicloCampainha = setInterval(tocarRajada, CAMPainha_DURACAO + CAMPainha_PAUSA);
}

function pararCampainha() {
  if (cicloCampainha) { clearInterval(cicloCampainha); cicloCampainha = null; }
  if (rajadaCampainha) { clearInterval(rajadaCampainha); rajadaCampainha = null; }
}

function alternarSino() {
  somBatida = !somBatida;
  if (!somBatida) pararCampainha();
  localStorage.setItem('som_batida', somBatida ? '1' : '0');
  $('btnSino').classList.toggle('desligado', !somBatida);
  if (somBatida) {
    const ctx = contextoAudio();
    if (ctx) tocarToque(ctx, ctx.currentTime + 0.02, 0.25);
  }
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
const portasAbertas = new Set();
let streamEcra = null;        // o que EU estou a partilhar
let ecraRemoto = null;        // { id, stream, nome } de quem estou a ver
let ecraNaGrelha = false;     // a ver dentro do modo reuniao
const midEcra = new Map();    // id do colega -> mid da faixa de ecra  // ids autorizados a falar comigo
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
  carregarHistorico();
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
        bolha(m.de, m.cor, m.texto, m.hora, {
          id: m.id, ficheiro: m.ficheiro, fixada: false, quando: m.quando,
        });
        break;
      case 'fixada':
        aplicarFixada(m.id, m.fixada);
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

        marcarTitulo(m.nome);
        comecarCampainha(m.nome);
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
    const antesPartilha = new Set([...players.values()].filter(p => p.partilha).map(p => p.id));
    players = new Map(m.players.map(p => [p.id, p]));

    // entrou/saiu da partilha: aviso + som
    for (const p of players.values()) {
      if (p.id === eu?.id) continue;

      const comecou = p.partilha && !antesPartilha.has(p.id);
      const acabou = !p.partilha && antesPartilha.has(p.id);

      if (comecou) {
        avisar(p.name + ' está a partilhar o ecrã.');
        tocarAvisoEcra('inicio');
        if (!salaAberta) mostrarAvisoEcra(p.name, p.id);
      }

      if (acabou) {
        avisoIgnorado.delete(p.id);
        avisar(p.name + ' parou de partilhar o ecrã.');
        tocarAvisoEcra('fim');
        if (ecraRemoto && ecraRemoto.id === p.id) {
          fecharEcra();
        }
        if (salaAberta) atualizarSala();
      }
    }
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
function tamanhoLegivel(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function bolha(de, cor, texto, hora, extra = {}) {
  const chat = document.getElementById('chat');
  const d = new Date(extra.quando || hora || Date.now());
  const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

  const el = document.createElement('div');
  el.className = 'msg' + (extra.fixada ? ' fixada' : '');
  if (extra.id) el.dataset.id = extra.id;

  const topo = document.createElement('div');
  topo.className = 'linhaTopo';
  topo.innerHTML = `<span><b style="color:${cor}">${escapar(de)}</b><span class="hora">${hh}</span></span>`;

  if (extra.id) {
    const pino = document.createElement('button');
    pino.className = 'fixar';
    pino.type = 'button';
    pino.textContent = extra.fixada ? '📌' : '📌';
    pino.title = extra.fixada ? 'Deixar de fixar' : 'Guardar para sempre (fixar)';
    pino.onclick = () => alternarFixada(extra.id, !extra.fixada);
    topo.appendChild(pino);
  }
  el.appendChild(topo);

  if (texto) {
    const t = document.createElement('div');
    t.className = 'textoMsg';
    t.textContent = texto;
    el.appendChild(t);
  }

  const f = extra.ficheiro;
  if (f && f.url) {
    const ehImagem = (f.mime || '').startsWith('image/') ||
      /\.(png|jpe?g|gif|webp)$/i.test(f.nome || '');

    if (ehImagem) {
      const img = document.createElement('img');
      img.className = 'anexo';
      img.src = f.url;
      img.alt = f.nome || 'imagem';
      img.loading = 'lazy';
      img.onclick = () => window.open(f.url, '_blank');
      el.appendChild(img);
    } else {
      const a = document.createElement('a');
      a.className = 'anexoFicheiro';
      a.href = f.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '📄 ' + escapar(f.nome || 'ficheiro') +
        ' <span class="tamanho">' + tamanhoLegivel(f.tamanho) + '</span>';
      el.appendChild(a);
    }
  }

  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

async function alternarFixada(id, fixada) {
  try {
    const r = await fetch('/api/mensagens/fixar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ id, fixada }),
    });
    if (!r.ok) return avisar('Não consegui fixar essa mensagem.');
  } catch (e) {
    avisar('Sem ligação para fixar.');
  }
}

// marca/desmarca visualmente (vem do servidor, para todos ficarem iguais)
function aplicarFixada(id, fixada) {
  const el = document.querySelector('.msg[data-id="' + id + '"]');
  if (!el) return;
  el.classList.toggle('fixada', fixada);
  const pino = el.querySelector('.fixar');
  if (pino) pino.title = fixada ? 'Deixar de fixar' : 'Guardar para sempre (fixar)';
}

// ---------- histórico (últimos 7 dias + fixadas) ----------
async function carregarHistorico() {
  try {
    const r = await fetch('/api/mensagens', { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) return;
    const d = await r.json();
    const chat = document.getElementById('chat');
    const lista = d.mensagens || [];
    if (!lista.length) return;

    chat.innerHTML = '';

    const fixadas = lista.filter(m => m.fixada);
    const resto = lista.filter(m => !m.fixada);

    const desenhar = (m) => bolha(m.autor, '#9aa4b2', m.texto, null, {
      id: m.id, ficheiro: m.ficheiro, fixada: m.fixada, quando: m.quando,
    });

    if (fixadas.length) {
      const div = document.createElement('div');
      div.className = 'divisorChat';
      div.textContent = 'fixadas';
      chat.appendChild(div);
      fixadas.forEach(desenhar);
    }

    if (resto.length) {
      const div = document.createElement('div');
      div.className = 'divisorChat';
      div.textContent = 'últimos ' + (d.dias || 7) + ' dias';
      chat.appendChild(div);
      resto.forEach(desenhar);
    }

    const fim = document.createElement('div');
    fim.className = 'divisorChat';
    fim.textContent = 'agora';
    chat.appendChild(fim);

    chat.scrollTop = chat.scrollHeight;
  } catch (e) {}
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

// ------------------------------------------------------------ anexos
const MAX_ANEXO = 10 * 1024 * 1024;

ligarClique('btnAnexo', 'onclick', () => document.getElementById('ficheiro').click());

document.getElementById('ficheiro').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;

  if (f.size > MAX_ANEXO) return avisar('Ficheiro grande demais (máximo 10 MB).');

  avisar('A enviar ' + f.name + '…');

  try {
    const base64 = await new Promise((ok, falha) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result).split(',')[1] || '');
      fr.onerror = falha;
      fr.readAsDataURL(f);
    });

    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ nome: f.name, mime: f.type, dados: base64 }),
    });

    if (!r.ok) {
      const erro = await r.json().catch(() => ({}));
      return avisar(erro.erro || 'Não consegui enviar o ficheiro.');
    }

    const info = await r.json();
    const legenda = document.getElementById('msg').value.trim();
    document.getElementById('msg').value = '';

    ws.send(JSON.stringify({ t: 'chat', texto: legenda, ficheiro: info }));
    avisar('');
  } catch (err) {
    avisar('Falhou o envio do ficheiro.');
  }
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
  if (k === 't' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); comecarPartilha(); }
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
  pararCampainha();
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

// ----- direcao vinda do toque (joystick, arrastar no mapa ou tocar num ponto)
const toqueDir = { x: 0, y: 0 };
let alvoToque = null;      // {x,y} no espaco do mapa, para "tocar para ir"
let arrastar = null;       // dedo a arrastar no mapa

function direcaoDeToque() {
  let dx = toqueDir.x, dy = toqueDir.y;

  if (!dx && !dy && alvoToque) {
    const p = players.get(eu?.id);
    if (p) {
      const ddx = alvoToque.x - p.x, ddy = alvoToque.y - p.y;
      if (Math.hypot(ddx, ddy) > 12) { dx = ddx; dy = ddy; }
      else alvoToque = null;   // chegou
    }
  }
  return [dx, dy];
}

function pontoNoMapa(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const cx = caixaDoMapa();
  return {
    x: (clientX - r.left - cx.offX) / cx.sx,
    y: (clientY - r.top - cx.offY) / cx.sy,
  };
}

function loop(t) {
  const p = players.get(eu?.id);

  if (p && !p.sitting) {
    let dx = 0, dy = 0;
    if (teclas.has('w') || teclas.has('arrowup')) dy -= 1;
    if (teclas.has('s') || teclas.has('arrowdown')) dy += 1;
    if (teclas.has('a') || teclas.has('arrowleft')) dx -= 1;
    if (teclas.has('d') || teclas.has('arrowright')) dx += 1;

    if (!dx && !dy) {
      const [tx, ty] = direcaoDeToque();
      dx = tx; dy = ty;
    } else {
      alvoToque = null;
    }
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
  montarToque();
requestAnimationFrame(loop);
}
  // ------------------------------------------------------------ partilha de ecra
async function comecarPartilha() {
  if (streamEcra) { pararPartilha(); return; }

  let ecra;
  try {
    ecra = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 } },
      audio: true,   // o browser mostra a opcao de partilhar o som do sistema
    });
  } catch (e) {
    if (e && e.name !== 'NotAllowedError') avisar('Não foi possível partilhar o ecrã.');
    return;
  }

  streamEcra = ecra;

  // se o audio do sistema nao veio (o browser nao ofereceu), partilha so a imagem
  const temAudio = ecra.getAudioTracks().length > 0;

  // avisar o servidor e juntar as faixas nas ligacoes que ja existem
  for (const [id, par] of pares) ligarEcra(id, par.pc);

  ws.send(JSON.stringify({ t: 'partilha', ligada: true }));

  const barra = document.getElementById('barraTela');
  document.getElementById('telaTexto').textContent =
    temAudio ? 'A partilhar o teu ecrã (com som)' : 'A partilhar o teu ecrã';
  barra.classList.remove('oculto');
  document.getElementById('btnTela').classList.add('ativo');

  // quando carregas em "parar partilha" no proprio Chrome
  ecra.getVideoTracks()[0].onended = () => pararPartilha();

  avisar('A partilhar o teu ecrã. Quem estiver ao teu lado vê.');
}

function ligarEcra(id, pc) {
  if (!streamEcra || !pc) return;
  for (const faixa of streamEcra.getTracks()) {
    if (pc.getSenders().some(s => s.track === faixa)) continue;
    const transmissor = pc.addTrack(faixa, streamEcra);
    if (faixa.kind === 'video') {
      const guardarMid = () => {
        if (transmissor.mid == null) return;
        midEcra.set(id, transmissor.mid);
        try { ws.send(JSON.stringify({ t: 'sinal', para: id, dados: { tipo: 'midEcra', mid: transmissor.mid } })); } catch (e) {}
      };
      guardarMid(); setTimeout(guardarMid, 400); setTimeout(guardarMid, 1500);
    }
  }
  // quem partilha e sempre quem manda a proposta
  renegociar(id, pc);
}

// se estou a partilhar e esta ligação ainda não leva o ecrã, acrescenta e renegocia
function garantirPartilhaNoPar(id, pc) {
  if (!streamEcra || !pc || pc.connectionState !== 'connected') return;

  let falta = false;
  for (const faixa of streamEcra.getTracks()) {
    const t = pc.getTransceivers().find(x => x.sender && x.sender.track === faixa && x.mid != null);
    if (!t) {
      if (!pc.getSenders().some(x => x.track === faixa)) {
        try { pc.addTrack(faixa, streamEcra); } catch (e) {}
      }
      falta = true;
    }
  }

  if (falta) {
    setTimeout(() => renegociar(id, pc), 300);
  } else {
    anunciarMidsEcra();
  }
}

function pararPartilha() {
  if (!streamEcra) return;
  const faixasAlvo = streamEcra.getTracks().slice();
  faixasAlvo.forEach(t => t.stop());
  streamEcra = null;

  const faixasEcra = faixasAlvo;
  for (const [id, par] of pares) {
    // parar o transceiver inteiro, não só o sender (senão a faixa fica órfã e volta na oferta seguinte)
    for (const t of par.pc.getTransceivers()) {
      if (t.sender && t.sender.track && faixasEcra.includes(t.sender.track)) {
        try { t.stop(); } catch (e) {}
      }
    }
    renegociar(id, par.pc);
  }

  ws.send(JSON.stringify({ t: 'partilha', ligada: false }));
  document.getElementById('barraTela').classList.add('oculto');
  document.getElementById('btnTela').classList.remove('ativo');
  fecharEcra();
  avisar('Paraste de partilhar o ecrã.');
}

async function renegociar(id, pc) {
  if (!pc) return;
  if (pc.signalingState !== 'stable') {
    // espera que estabilize (envio de ICE ou resposta a caminho) e tenta de novo
    setTimeout(() => renegociar(id, pc), 700);
    return;
  }
  try {
    const oferta = await pc.createOffer();
    await pc.setLocalDescription(oferta);

    // depois do setLocalDescription os mids já existem: dizemos qual é o do ecrã
    const dados = { tipo: 'offer', sdp: pc.localDescription, partilha: !!streamEcra };
    if (streamEcra) {
      for (const t of pc.getTransceivers()) {
        if (t.sender && t.sender.track && streamEcra.getTracks().includes(t.sender.track) &&
            t.sender.track.kind === 'video' && t.mid != null) {
          dados.midEcra = t.mid;
          midEcra.set(id, t.mid);
        }
      }
    }
    ws.send(JSON.stringify({ t: 'sinal', para: id, dados }));

    // depois de estabelecer, anuncia os mids das faixas de ecra
    setTimeout(anunciarMidsEcra, 500);
    setTimeout(anunciarMidsEcra, 2000);
  } catch (e) {
    setTimeout(() => renegociar(id, pc), 900);
  }
}

function anunciarMidsEcra() {
  if (!streamEcra) return;
  for (const [id, par] of pares) {
    for (const t of par.pc.getTransceivers()) {
      if (!t.sender || !t.sender.track) continue;
      if (!streamEcra.getTracks().includes(t.sender.track)) continue;
      if (t.sender.track.kind !== 'video') continue;
      if (t.mid == null) continue;
      midEcra.set(id, t.mid);
      ws.send(JSON.stringify({ t: 'sinal', para: id, dados: { tipo: 'midEcra', mid: t.mid } }));
    }
  }
}

function negociar(id, pc, transmissor) {
  if (pc.signalingState !== 'stable') return;
  renegociar(id, pc);
}

// ---------- do lado de quem VE ----------
function receberEcra(id, stream) {
  const nome = players.get(id)?.name || 'Um colega';
  const jaEstavaAberto = ecraRemoto && ecraRemoto.id === id &&
    !document.getElementById('ecraOverlay').classList.contains('oculto');

  ecraRemoto = { id, stream, nome };

  if (salaAberta) {
    // no modo reunião o ecrã entra na grelha, sem interromper nada
    atualizarSala();
    avisar(nome + ' está a partilhar o ecrã.');
    return;
  }

  if (jaEstavaAberto) {
    mostrarEcra();          // já estava a ver: continua
  } else {
    mostrarAvisoEcra(nome, id); // não abre sozinho — a pessoa decide
  }
}

// ---------- aviso de partilha (opcional) ----------
let avisoIgnorado = new Set();   // quem já disse "não quero ver"

function mostrarAvisoEcra(nome, id) {
  if (id && avisoIgnorado.has(id)) return;
  const b = document.getElementById('bannerEcra');
  if (!b) return;
  document.getElementById('bannerTexto').textContent = nome + ' está a partilhar o ecrã';
  b.classList.remove('oculto');
}

function esconderAvisoEcra() {
  const b = document.getElementById('bannerEcra');
  if (b) b.classList.add('oculto');
}

function mostrarEcra() {
  if (!ecraRemoto) return;
  const ov = document.getElementById('ecraOverlay');
  const v = document.getElementById('ecraVideo');
  v.srcObject = ecraRemoto.stream;
  v.muted = false;
  v.play().catch(() => {});
  document.getElementById('ecraNome').textContent = 'Ecrã de ' + ecraRemoto.nome;
  ov.classList.remove('oculto');
}

function fecharEcra() {
  esconderAvisoEcra();
  if (ecraNaGrelha) { ecraNaGrelha = false; return; }
  const ov = document.getElementById('ecraOverlay');
  const v = document.getElementById('ecraVideo');
  ov.classList.add('oculto');
  v.srcObject = null;
  ecraRemoto = null;
}

// som de entrar / sair da partilha (subir = entrou, descer = saiu)
function tocarAvisoEcra(tipo) {
  if (!somBatida) return;
  const ctx = contextoAudio();
  if (!ctx) return;

  const t = ctx.currentTime + 0.02;
  const entra = tipo !== 'fim';
  const notas = entra ? [523.25, 783.99] : [783.99, 523.25];

  notas.forEach((freq, i) => {
    const inicio = t + i * 0.13;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, inicio);
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(0.22, inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.24);
    osc.connect(g).connect(ctx.destination);
    osc.start(inicio); osc.stop(inicio + 0.26);
  });
}

// ao receber uma ligacao nova, se estou a partilhar, levo o ecra comigo
function partilhaParaPar(id, pc) {
  if (!streamEcra) return;
  for (const faixa of streamEcra.getTracks()) {
    try { pc.addTrack(faixa, streamEcra); } catch (e) {}
  }
}

ligarClique('btnVerEcra', 'onclick', () => { esconderAvisoEcra(); mostrarEcra(); });
ligarClique('btnIgnorarEcra', 'onclick', () => {
  if (ecraRemoto) avisoIgnorado.add(ecraRemoto.id);
  esconderAvisoEcra();
});
ligarClique('btnTela', 'onclick', comecarPartilha);
ligarClique('btnPararTela', 'onclick', pararPartilha);
ligarClique('btnFecharEcra', 'onclick', fecharEcra);
ligarClique('btnTamanhoEcra', 'onclick', () => {
  const ov = document.getElementById('ecraOverlay');
  ov.classList.toggle('grande');
});

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

  // o ecra de quem partilha ocupa a linha de cima
  const ecra = ecraRemoto ? ecraRemoto : (streamEcra ? { id: 'eu', stream: streamEcra, nome: 'O teu ecrã (a partilhar)' } : null);
  let tileEcra = grelha.querySelector('.tile.telaGrelha');
  if (ecra) {
    if (!tileEcra) {
      tileEcra = document.createElement('div');
      tileEcra.className = 'tile telaGrelha';
      const v = document.createElement('video');
      v.autoplay = true; v.playsInline = true; v.muted = true;
      v.style.objectFit = 'contain';
      const nome = document.createElement('div');
      nome.className = 'nome';
      tileEcra.append(v, nome);
      grelha.prepend(tileEcra);
    }
    const v = tileEcra.querySelector('video');
    if (v.srcObject !== ecra.stream) { v.srcObject = ecra.stream; v.play().catch(() => {}); }
    tileEcra.querySelector('.nome').textContent = ecra.nome;
    grelha.style.gridTemplateRows = 'minmax(240px,1.6fr) 1fr';
  } else if (tileEcra) {
    tileEcra.remove();
    grelha.style.gridTemplateRows = '';
  }

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
  if (e.key !== 'Escape') return;
  const ov = document.getElementById('ecraOverlay');
  if (ov && !ov.classList.contains('oculto')) { fecharEcra(); return; }
  if (salaAberta) fecharSala();
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
function seguirAvatar() {
  const euJogador = players.get(eu?.id);
  if (!euJogador) return;
  camera.x += (euJogador.x - camera.x) * 0.12;
  camera.y += (euJogador.y - camera.y) * 0.12;
}

function desenhar() {
  if (modoCamera()) seguirAvatar();
  const dpr = Math.min(window.devicePixelRatio || 2, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasCss.w, canvasCss.h);

  // fundo fora do mapa (barras)
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, canvasCss.w, canvasCss.h);

  const cx = caixaDoMapa();

  // grade em todo o ecrã, alinhada com o mapa (sem emendas nem barras)
  const passo = 50 * cx.sx;
  if (passo > 6) {
    ctx.strokeStyle = 'rgba(255,255,255,.022)';
    ctx.lineWidth = 1;
    for (let x = cx.offX % passo; x < canvasCss.w; x += passo) {
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, canvasCss.h); ctx.stroke();
    }
    for (let y = cx.offY % passo; y < canvasCss.h; y += passo) {
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(canvasCss.w, Math.round(y) + .5); ctx.stroke();
    }
  }

  ctx.setTransform(dpr * cx.sx, 0, 0, dpr * cx.sy, dpr * cx.offX, dpr * cx.offY);

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

    // quem esta a partilhar o ecra
    if (p.partilha) {
      ctx.textAlign = 'center';
      ctx.font = '700 9.5px "Segoe UI",sans-serif';
      const txt = 'A PARTILHAR';
      const l = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(224,75,75,.95)';
      ctx.beginPath();
      ctx.roundRect(p.x - l / 2 - 8, p.y - RAIO_AVATAR - 24, l + 16, 17, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, p.x, p.y - RAIO_AVATAR - 11.5);
      ctx.textAlign = 'left';
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
  partilhaParaPar(id, pc);

  pc.onicecandidate = (e) => {
    if (e.candidate) ws.send(JSON.stringify({ t: 'sinal', para: id, dados: { tipo: 'ice', candidate: e.candidate } }));
  };

  pc.ontrack = (e) => {
    const par = pares.get(id);
    if (!par) return;

    const meuMid = e.transceiver ? e.transceiver.mid : null;
    const midDoEcra = midEcra.get(id);
    const ehEcra = (midDoEcra != null && String(midDoEcra) === String(meuMid))
      || (par.partilhaPendente && e.track.kind === 'video' &&
          par.streamEcra && par.streamEcra.getVideoTracks().length > 0);

    if (ehEcra) {
      // as faixas do ecrã vão para um stream só delas — nunca mexem no da câmara
      if (!par.streamEcra) par.streamEcra = new MediaStream();
      if (!par.streamEcra.getTracks().some(t => t.id === e.track.id)) {
        par.streamEcra.addTrack(e.track);
      }
      receberEcra(id, par.streamEcra);
      return;
    }

    // câmara/voz: um único stream por pessoa, que só cresce (nunca é substituído)
    if (!par.streamRemoto) {
      par.streamRemoto = new MediaStream();
      videoEl.srcObject = par.streamRemoto;
      videoEl.play().catch(() => {});
    }
    if (!par.streamRemoto.getTracks().some(t => t.id === e.track.id)) {
      par.streamRemoto.addTrack(e.track);
    }
    cardEl.classList.remove('semcam');
    atualizarSala();
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) fecharPar(id);
    if (pc.connectionState === 'connected') {
      // já ligado: garantir que, se estou a partilhar, o ecrã também foi
      setTimeout(() => garantirPartilhaNoPar(id, pc), 600);
    }
  };

  // sempre que entram/saem faixas, alguém tem de mandar a nova oferta
  pc.onnegotiationneeded = async () => {
    // nao faz nada: a renegociacao e pedida explicitamente ao abrir/fechar partilha
    // (evita as duas pontas a criar ofertas ao mesmo tempo, o que troca os mids)
  };

  pares.set(id, { pc, videoEl, cardEl, iniciador });
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

  if (dados.midEcra != null) {
    midEcra.set(de, dados.midEcra);
    const parAntes = pares.get(de);
    if (parAntes) parAntes.partilhaPendente = true;
  }
  if (dados.partilha === false) {
    const parAntes = pares.get(de);
    if (parAntes) { parAntes.partilhaPendente = false; parAntes.streamEcra = null; }
  }
  if (dados.tipo === 'midEcra' && dados.mid != null) {
    midEcra.set(de, dados.mid);
    // pode ja ter chegado antes do ontrack: reaproveitar a faixa
    const par = pares.get(de);
    if (par) {
      const t = par.pc.getTransceivers().find(x => String(x.mid) === String(dados.mid));
      if (t && t.receiver && t.receiver.track && t.receiver.track.readyState === 'live') {
        const st = new MediaStream([t.receiver.track]);
        const outroVideo = par.pc.getTransceivers().find(x => x !== t && x.receiver && x.receiver.track && x.receiver.track.kind === 'video');
        if (outroVideo && outroVideo.receiver.track.readyState === 'live') st.addTrack(outroVideo.receiver.track);
        const audio = par.pc.getTransceivers().find(x => x.receiver && x.receiver.track && x.receiver.track.kind === 'audio');
        if (audio && audio.receiver.track.readyState === 'live') st.addTrack(audio.receiver.track);
        receberEcra(de, st);
      }
    }
    return;
  }

  if (dados.tipo === 'offer') {
    if (!par) { criarPar(de, false); par = pares.get(de); }
    if (par.pc.signalingState !== 'stable') return;
    await par.pc.setRemoteDescription(new RTCSessionDescription(dados.sdp));
    const resposta = await par.pc.createAnswer();
    await par.pc.setLocalDescription(resposta);
    ws.send(JSON.stringify({ t: 'sinal', para: de, dados: { tipo: 'answer', sdp: par.pc.localDescription } }));
  } else if (dados.tipo === 'renegociar' && par) {
    await renegociar(de, par.pc);
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
  if (ecraRemoto && ecraRemoto.id === id) {
    document.getElementById('ecraOverlay').classList.add('oculto');
    document.getElementById('ecraVideo').srcObject = null;
    ecraRemoto = null;
  }
  atualizarSala();
}

// ------------------------------------------------------------ controlos de toque
function ehEcraPequeno() {
  return window.matchMedia('(max-width:820px)').matches ||
         window.matchMedia('(max-height:480px) and (orientation:landscape)').matches;
}

function montarToque() {
  const joystick = document.getElementById('joystick');
  const lateral = document.getElementById('lateral');
  const btnChat = document.getElementById('btnChat');

  const aplicarModo = () => {
    const pequeno = ehEcraPequeno();
    if (joystick) joystick.classList.toggle('oculto', !pequeno);
    if (btnChat) btnChat.classList.toggle('oculto', !pequeno);
    if (!pequeno) lateral.classList.remove('aberta');
    // o canvas acompanha o espaco disponivel
    ajustarCanvas();
    canvas.style.cursor = pequeno ? 'grab' : 'default';
    if (!pequeno) { toqueDir.x = 0; toqueDir.y = 0; alvoToque = null; }
  };

  // ---- joystick (segurar para andar)
  const soltar = () => { toqueDir.x = 0; toqueDir.y = 0; };
  joystick.querySelectorAll('[data-dir]').forEach(btn => {
    const dir = btn.dataset.dir;
    const definir = (e) => {
      e.preventDefault();
      alvoToque = null;
      if (dir === 'up') { toqueDir.x = 0; toqueDir.y = -1; }
      if (dir === 'down') { toqueDir.x = 0; toqueDir.y = 1; }
      if (dir === 'left') { toqueDir.x = -1; toqueDir.y = 0; }
      if (dir === 'right') { toqueDir.x = 1; toqueDir.y = 0; }
    };
    btn.addEventListener('pointerdown', definir);
    btn.addEventListener('pointerup', soltar);
    btn.addEventListener('pointercancel', soltar);
    btn.addEventListener('pointerleave', soltar);
  });

  joystick.querySelectorAll('[data-acao]').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const acao = btn.dataset.acao;
      if (acao === 'sentar') alternarSentar();
    });
  });

  // ---- gaveta do chat
  const abrirGaveta = () => lateral.classList.toggle('aberta');
  document.querySelector('#lateral .topo').addEventListener('click', (e) => {
    if (!ehEcraPequeno()) return;
    if (e.target.closest('button')) return;   // os botoes fazem o que têm de fazer
    abrirGaveta();
  });
  if (btnChat) btnChat.addEventListener('click', () => {
    lateral.classList.add('aberta');
    setTimeout(() => document.getElementById('msg').focus(), 250);
  });

  // arrastar a gaveta para baixo fecha
  let toqueInicial = null;
  lateral.addEventListener('touchstart', (e) => {
    if (!ehEcraPequeno() || !lateral.classList.contains('aberta')) return;
    toqueInicial = { y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  lateral.addEventListener('touchend', (e) => {
    if (!toqueInicial) return;
    const dy = e.changedTouches[0].clientY - toqueInicial.y;
    if (dy > 90 && Date.now() - toqueInicial.t < 700) lateral.classList.remove('aberta');
    toqueInicial = null;
  }, { passive: true });

  // ---- tocar no mapa anda ate la; arrastar tambem
  canvas.style.cursor = ehEcraPequeno() ? 'grab' : 'default';

  canvas.addEventListener('pointerdown', (e) => {
    if (!ehEcraPequeno()) return;
    arrastar = { x: e.clientX, y: e.clientY };
    alvoToque = pontoNoMapa(e.clientX, e.clientY);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastar) return;
    alvoToque = pontoNoMapa(e.clientX, e.clientY);
  });
  const fimArrasto = () => { arrastar = null; canvas.style.cursor = ehEcraPequeno() ? 'grab' : 'default'; };
  canvas.addEventListener('pointerup', fimArrasto);
  canvas.addEventListener('pointercancel', fimArrasto);

  // ---- teclado virtual: ao escrever, a gaveta sobe e o mapa nao foge
  document.getElementById('msg').addEventListener('focus', () => {
    if (!ehEcraPequeno()) return;
    lateral.classList.add('aberta');
    setTimeout(() => document.getElementById('chat').scrollTop = 1e9, 300);
  });

  // ---- ecra mudou de tamanho ou de orientacao
  window.addEventListener('resize', aplicarModo);
  window.addEventListener('orientationchange', () => setTimeout(aplicarModo, 220));
  window.matchMedia('(max-width:820px)').addEventListener?.('change', aplicarModo);

  aplicarModo();
}

// o canvas acompanha o espaço disponível (sem redimensionar a cada frame!)
function ajustarCanvas() {
  // medir o PRÓPRIO canvas (o contentor é mais largo que ele no desktop)
  let r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) r = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 2, 2);
  const larguraCss = Math.max(280, Math.round(r.width));
  const alturaCss = Math.max(200, Math.round(r.height));

  // redimensionar o canvas apaga-o: só quando o tamanho mudou mesmo
  if (larguraCss === canvasCss.w && alturaCss === canvasCss.h) return;

  canvasCss = { w: larguraCss, h: alturaCss };
  canvas.width = Math.round(larguraCss * dpr);
  canvas.height = Math.round(alturaCss * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // 1 unidade = 1 pixel CSS
}

let canvasCss = { w: 800, h: 600 };

// No telemovel o mapa nao cabe inteiro: enche a largura e segue o avatar (camera).
// No computador continua a caber tudo, como sempre.
let camera = { x: LARG / 2, y: ALT / 2 };

function modoCamera() {
  // só em ecrãs verticais (telemóvel/tablet em pé).
  // deitado ou no computador mostra-se o mapa inteiro.
  return ehEcraPequeno() && window.innerHeight > 480;
}

function caixaDoMapa() {
  // Computador: mostra o mapa inteiro, sem esticar (mantém a proporção 16:10).
  if (!modoCamera()) {
    const e = Math.min(canvasCss.w / LARG, canvasCss.h / ALT);
    return {
      sx: e,
      sy: e,
      offX: (canvasCss.w - LARG * e) / 2,
      offY: (canvasCss.h - ALT * e) / 2,
    };
  }

  // Telemóvel/tablet: mostra ~780 unidades de largura e segue o avatar.
  // Só segue nos eixos em que o mapa é maior que o ecrã (senão ficaria deslocado).
  const vista = canvasCss.w < 520 ? 780 : 1000;
  const e = canvasCss.w / vista;

  const largVis = canvasCss.w / e;
  const altVis = canvasCss.h / e;

  let offX, offY;

  if (largVis >= LARG) {
    offX = (canvasCss.w - LARG * e) / 2;
  } else {
    camera.x = Math.max(largVis / 2, Math.min(LARG - largVis / 2, camera.x));
    offX = canvasCss.w / 2 - camera.x * e;
  }

  if (altVis >= ALT) {
    offY = (canvasCss.h - ALT * e) / 2;
  } else {
    camera.y = Math.max(altVis / 2, Math.min(ALT - altVis / 2, camera.y));
    offY = canvasCss.h / 2 - camera.y * e;
  }

  return { sx: e, sy: e, offX, offY };
}

// ------------------------------------------------------------ vídeos no ecrã
function posicionarVideos() {
  const rect = canvas.getBoundingClientRect();

  const cx = caixaDoMapa();

  for (const [id, par] of pares) {
    const p = players.get(id);
    if (!p) { par.cardEl.style.opacity = '0'; continue; }
    par.cardEl.style.opacity = '1';
    par.cardEl.style.left = (rect.left + cx.offX + p.x * cx.sx) + 'px';
    par.cardEl.style.top = (rect.top + cx.offY + (p.y - RAIO_AVATAR - 26) * cx.sy) + 'px';
    par.cardEl.classList.toggle('semcam', !p.camOn);
  }
}

montarToque();
requestAnimationFrame(loop);
