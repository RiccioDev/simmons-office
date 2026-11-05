// Mensagens do chat: guardadas 1 semana. As "fixadas" ficam para sempre.
// - com DATABASE_URL usa Postgres
// - sem isso, usa mensagens.json

const fs = require('fs');
const path = require('path');

const FICHEIRO = path.join(__dirname, 'mensagens.json');
const DIAS = 7;

const usaPostgres = !!process.env.DATABASE_URL;
let Pool = null;
let pool = null;

if (usaPostgres) {
  try { ({ Pool } = require('pg')); } catch (e) { console.log('mensagens: pg nao instalado, uso ficheiro'); }
}

async function iniciar() {
  if (usaPostgres && Pool) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 3,
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mensagens (
          id       TEXT PRIMARY KEY,
          autor    TEXT NOT NULL,
          texto    TEXT NOT NULL DEFAULT '',
          tipo     TEXT NOT NULL DEFAULT 'texto',
          ficheiro JSONB,
          quando   TIMESTAMPTZ NOT NULL DEFAULT now(),
          fixada   BOOLEAN NOT NULL DEFAULT false
        )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS mensagens_quando ON mensagens (quando DESC)`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ficheiros (
          id    TEXT PRIMARY KEY,
          nome  TEXT NOT NULL,
          mime  TEXT NOT NULL,
          bytes BYTEA NOT NULL,
          quando TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
      return true;
    } catch (e) {
      console.log('mensagens: falha no Postgres, uso ficheiro:', e.message);
      pool = null;
    }
  }
  return false;
}

function lerFicheiro() {
  try {
    const d = JSON.parse(fs.readFileSync(FICHEIRO, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch (e) { return []; }
}

function gravarFicheiro(lista) {
  const tmp = FICHEIRO + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(lista));
  fs.renameSync(tmp, FICHEIRO);
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// guarda e devolve a mensagem já com id e data
async function guardar({ autor, texto = '', tipo = 'texto', ficheiro = null }) {
  const m = {
    id: novoId(),
    autor: String(autor || 'Alguém').slice(0, 60),
    texto: String(texto || '').slice(0, 2000),
    tipo: tipo === 'imagem' || tipo === 'ficheiro' ? tipo : 'texto',
    ficheiro: ficheiro || null,
    quando: new Date().toISOString(),
    fixada: false,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO mensagens (id, autor, texto, tipo, ficheiro, quando, fixada)
       VALUES ($1,$2,$3,$4,$5,$6,false)`,
      [m.id, m.autor, m.texto, m.tipo, m.ficheiro, m.quando]
    );
  } else {
    const lista = lerFicheiro();
    lista.push(m);
    gravarFicheiro(lista.slice(-800));
  }
  return m;
}

async function listar() {
  if (pool) {
    const r = await pool.query(
      `SELECT id, autor, texto, tipo, ficheiro, quando, fixada
         FROM mensagens
        WHERE fixada = true OR quando > now() - interval '${DIAS} days'
        ORDER BY quando ASC
        LIMIT 500`
    );
    return r.rows;
  }
  const limite = Date.now() - DIAS * 24 * 3600 * 1000;
  return lerFicheiro().filter(m => m.fixada || new Date(m.quando).getTime() > limite);
}

async function fixar(id, valor) {
  if (pool) {
    const r = await pool.query(
      'UPDATE mensagens SET fixada = $2 WHERE id = $1 RETURNING id, fixada',
      [id, !!valor]
    );
    return r.rows[0] || null;
  }
  const lista = lerFicheiro();
  const m = lista.find(x => x.id === id);
  if (!m) return null;
  m.fixada = !!valor;
  gravarFicheiro(lista);
  return { id: m.id, fixada: m.fixada };
}

// apaga o que passou dos 7 dias (as fixadas nunca saem)
async function limparAntigas() {
  if (pool) {
    const r = await pool.query(
      `DELETE FROM mensagens WHERE fixada = false AND quando < now() - interval '${DIAS} days'`
    );
    return r.rowCount || 0;
  }
  const limite = Date.now() - DIAS * 24 * 3600 * 1000;
  const lista = lerFicheiro();
  const ficam = lista.filter(m => m.fixada || new Date(m.quando).getTime() > limite);
  const apagadas = lista.length - ficam.length;
  if (apagadas) gravarFicheiro(ficam);
  return apagadas;
}

function modo() {
  return pool ? 'postgres' : 'ficheiro';
}

module.exports = { iniciar, guardar, listar, fixar, limparAntigas, DIAS, modo };


// ---------------------------------------------------------------- anexos
// No Postgres os ficheiros ficam na base (o disco do Render é apagado a cada deploy).
async function guardarFicheiro({ nome, mime, bytes }) {
  const id = novoId() + (String(nome).match(/\.[a-z0-9]{1,5}$/i) || [''])[0].toLowerCase();

  if (pool) {
    await pool.query(
      'INSERT INTO ficheiros (id, nome, mime, bytes) VALUES ($1,$2,$3,$4)',
      [id, nome, mime, bytes]
    );
  } else {
    const pasta = path.join(__dirname, 'ficheiros');
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, id), bytes);
  }
  return id;
}

async function lerFicheiroAnexo(id) {
  const seguro = path.basename(String(id || ''));
  if (!seguro) return null;

  if (pool) {
    const r = await pool.query('SELECT nome, mime, bytes FROM ficheiros WHERE id = $1', [seguro]);
    if (!r.rows.length) return null;
    return { nome: r.rows[0].nome, mime: r.rows[0].mime, bytes: r.rows[0].bytes };
  }

  try {
    const bytes = fs.readFileSync(path.join(__dirname, 'ficheiros', seguro));
    return { nome: seguro, mime: '', bytes };
  } catch (e) { return null; }
}

module.exports.guardarFicheiro = guardarFicheiro;
module.exports.lerFicheiro = lerFicheiroAnexo;
