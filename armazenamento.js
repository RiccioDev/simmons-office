// Armazenamento das mesas.
// - com DATABASE_URL (Render Postgres) usa Postgres, e os donos ficam permanentes
// - sem DATABASE_URL cai para mesas.json local (uso no PC de casa)

const fs = require('fs');
const path = require('path');

const FICHEIRO = path.join(__dirname, 'mesas.json');
const usaPostgres = !!process.env.DATABASE_URL;

let Pool = null;
let pool = null;
let pronto = Promise.resolve(false);
let ultimoErro = null;

if (usaPostgres) {
  try {
    ({ Pool } = require('pg'));
  } catch (e) {
    console.log('aviso: modulo pg nao instalado, a usar ficheiro local');
  }
}

async function iniciar() {
  if (!usaPostgres || !Pool) return false;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 3,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mesas (
      id        INTEGER PRIMARY KEY,
      label     TEXT NOT NULL,
      owner     TEXT NOT NULL DEFAULT '',
      locked    BOOLEAN NOT NULL DEFAULT false,
      atualizado TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  console.log('Postgres ligado — os donos das mesas sao permanentes.');
  return true;
}

pronto = iniciar().catch((e) => {
  ultimoErro = e.message;
  console.log('Postgres indisponivel (' + e.message + '), a usar ficheiro local');
  pool = null;
  return false;
});

// ------------------------------------------------------------------ API

// Devolve um mapa id -> { owner, locked } guardado
async function carregar() {
  await pronto;
  const saida = new Map();

  if (pool) {
    try {
      const r = await pool.query('SELECT id, owner, locked FROM mesas');
      for (const linha of r.rows) {
        saida.set(linha.id, { owner: linha.owner || '', locked: !!linha.locked });
      }
      return saida;
    } catch (e) {
      console.log('erro ao ler do Postgres:', e.message);
    }
  }

  try {
    if (fs.existsSync(FICHEIRO)) {
      const lista = JSON.parse(fs.readFileSync(FICHEIRO, 'utf8'));
      if (Array.isArray(lista)) {
        for (const m of lista) saida.set(m.id, { owner: m.owner || '', locked: !!m.locked });
      }
    }
  } catch (e) {
    console.log('mesas.json ilegivel');
  }
  return saida;
}

// Grava uma mesa (chamado quando o dono muda ou o cadeado tranca)
async function gravar(mesa) {
  await pronto;

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO mesas (id, label, owner, locked, atualizado)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (id) DO UPDATE
           SET label = EXCLUDED.label,
               owner = EXCLUDED.owner,
               locked = EXCLUDED.locked,
               atualizado = now()`,
        [mesa.id, mesa.label, mesa.owner || '', !!mesa.locked]
      );
      return;
    } catch (e) {
      console.log('erro ao gravar no Postgres:', e.message);
    }
  }

  // fallback local: grava a lista inteira
  try {
    const lista = (global.__mesasParaFicheiro || []).map(({ id, label, owner, locked }) => ({ id, label, owner, locked }));
    fs.writeFileSync(FICHEIRO, JSON.stringify(lista, null, 2), 'utf8');
  } catch (e) {
    console.log('erro ao gravar mesas.json:', e.message);
  }
}

function modoArmazenamento() {
  return pool ? 'postgres' : 'ficheiro local';
}

function diagnostico() {
  return {
    modo: modoArmazenamento(),
    temDatabaseUrl: !!process.env.DATABASE_URL,
    urlComeca: (process.env.DATABASE_URL || '').slice(0, 14),
    temModuloPg: !!Pool,
    erro: ultimoErro,
  };
}

module.exports = { carregar, gravar, modoArmazenamento, diagnostico, pronto };
