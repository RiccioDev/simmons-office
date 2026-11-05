// Autenticação: contas, palavras-passe e tokens assinados.
// Sem email, sem dependências externas — utilizador + palavra-passe.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// segredo dos tokens: usa AUTH_SECRET do ambiente, ou gera um e guarda em ficheiro
const fs = require('fs');
const path = require('path');
const FICHEIRO_SEGREDO = path.join(__dirname, 'segredo.txt');

function segredo() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    if (fs.existsSync(FICHEIRO_SEGREDO)) return fs.readFileSync(FICHEIRO_SEGREDO, 'utf8').trim();
    const novo = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(FICHEIRO_SEGREDO, novo, 'utf8');
    return novo;
  } catch (e) {
    return 'segredo-de-emergencia-nao-usar-em-producao';
  }
}

const CHAVE = segredo();
const VALIDADE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function assinar(payload) {
  const corpo = base64url(JSON.stringify(payload));
  const assinatura = crypto.createHmac('sha256', CHAVE).update(corpo).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return corpo + '.' + assinatura;
}

function verificar(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [corpo, assinatura] = token.split('.');
  const esperada = crypto.createHmac('sha256', CHAVE).update(corpo).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (assinatura.length !== esperada.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!dados.exp || dados.exp < Date.now()) return null;
    return dados;
  } catch (e) {
    return null;
  }
}

function criarToken(utilizador) {
  return assinar({
    u: utilizador.username,
    n: utilizador.display_name || utilizador.username,
    a: !!utilizador.is_admin,
    exp: Date.now() + VALIDADE_MS,
  });
}

async function hashSenha(senha) {
  return bcrypt.hash(senha, 10);
}

async function conferirSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

// senha inicial legível: 3 palavras + numero
function senhaTemporaria() {
  const palavras = ['sol', 'mar', 'lua', 'ceu', 'rio', 'flor', 'casa', 'ponte', 'pedra', 'vento'];
  const a = palavras[Math.floor(Math.random() * palavras.length)];
  const b = palavras[Math.floor(Math.random() * palavras.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return a + '-' + b + '-' + n;
}

module.exports = { criarToken, verificar, hashSenha, conferirSenha, senhaTemporaria };
