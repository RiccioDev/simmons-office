// Armazenamento das mesas e das contas.
// - com DATABASE_URL (Render Postgres) usa Postgres: permanente
// - sem DATABASE_URL cai para ficheiros JSON locais (uso no PC de casa)

const fs = require('fs');
const path = require('path');

const FICHEIRO = path.join(__dirname, 'mesas.json');
const FICHEIRO_USERS = path.join(__dirname, 'utilizadores.json');
const usaPostgres = !!process.env.DATABASE_URL;

let Pool = null;
let pool = null;
let pronto = Promise.resolve(false);
let ultimoErro = null;

if (usaPostgres) {
  try {
    ({ Pool } = require('pg'));
  } catch (e) {
    console.log('aviso: modulo pg nao instalado, a usar arquivo local');
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

  // quem é o dono (username), para libertar a mesa quando a conta sai do sistema
  await pool.query(`ALTER TABLE mesas ADD COLUMN IF NOT EXISTS owner_user TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilizadores (
      username     TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      senha_hash   TEXT NOT NULL,
      is_admin     BOOLEAN NOT NULL DEFAULT false,
      criado       TIMESTAMPTZ NOT NULL DEFAULT now(),
      visto        TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS convites (
      codigo     TEXT PRIMARY KEY,
      criado     TIMESTAMPTZ NOT NULL DEFAULT now(),
      expira     TIMESTAMPTZ NOT NULL,
      usado      TIMESTAMPTZ,
      usado_por  TEXT,
      criado_por TEXT
    )
  `);

  console.log('Postgres ligado - mesas e contas permanentes.');
  return true;
}

pronto = iniciar().catch((e) => {
  ultimoErro = e.message;
  console.log('Postgres indisponivel (' + e.message + '), a usar arquivo local');
  pool = null;
  return false;
});

// ------------------------------------------------------------------ mesas

async function carregar() {
  await pronto;
  const saida = new Map();

  if (pool) {
    try {
      const r = await pool.query('SELECT id, owner, owner_user, locked FROM mesas');
      for (const linha of r.rows) {
        saida.set(linha.id, {
          owner: linha.owner || '',
          ownerUser: linha.owner_user || '',
          locked: !!linha.locked,
        });
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
        for (const m of lista) saida.set(m.id, {
          owner: m.owner || '', ownerUser: m.ownerUser || '', locked: !!m.locked,
        });
      }
    }
  } catch (e) {
    console.log('mesas.json ilegivel');
  }
  return saida;
}

async function gravar(mesa) {
  await pronto;

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO mesas (id, label, owner, owner_user, locked, atualizado)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (id) DO UPDATE
           SET label = EXCLUDED.label,
               owner = EXCLUDED.owner,
               owner_user = EXCLUDED.owner_user,
               locked = EXCLUDED.locked,
               atualizado = now()`,
        [mesa.id, mesa.label, mesa.owner || '', mesa.ownerUser || '', !!mesa.locked]
      );
      return;
    } catch (e) {
      console.log('erro ao gravar no Postgres:', e.message);
    }
  }

  try {
    const lista = (global.__mesasParaFicheiro || []).map(({ id, label, owner, ownerUser, locked }) =>
      ({ id, label, owner, ownerUser: ownerUser || '', locked }));
    fs.writeFileSync(FICHEIRO, JSON.stringify(lista, null, 2), 'utf8');
  } catch (e) {
    console.log('erro ao gravar mesas.json:', e.message);
  }
}

// ------------------------------------------------------------------ contas

function lerUtilizadoresFicheiro() {
  try {
    if (fs.existsSync(FICHEIRO_USERS)) {
      const l = JSON.parse(fs.readFileSync(FICHEIRO_USERS, 'utf8'));
      return Array.isArray(l) ? l : [];
    }
  } catch (e) {
    console.log('utilizadores.json ilegivel');
  }
  return [];
}

function gravarUtilizadoresFicheiro(lista) {
  try {
    fs.writeFileSync(FICHEIRO_USERS, JSON.stringify(lista, null, 2), 'utf8');
  } catch (e) {
    console.log('erro ao gravar utilizadores.json:', e.message);
  }
}

async function contarUtilizadores() {
  await pronto;
  if (pool) {
    try {
      const r = await pool.query('SELECT COUNT(*)::int AS n FROM utilizadores');
      return r.rows[0].n;
    } catch (e) { }
  }
  return lerUtilizadoresFicheiro().length;
}

async function criarUtilizador({ username, displayName, senhaHash, isAdmin }) {
  await pronto;
  const u = String(username).toLowerCase().trim();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO utilizadores (username, display_name, senha_hash, is_admin)
         VALUES ($1, $2, $3, $4)`,
        [u, displayName, senhaHash, !!isAdmin]
      );
      return true;
    } catch (e) {
      if (e.code === '23505') throw new Error('Esse utilizador ja existe.');
      throw e;
    }
  }

  const lista = lerUtilizadoresFicheiro();
  if (lista.some(x => x.username === u)) throw new Error('Esse utilizador ja existe.');
  lista.push({ username: u, display_name: displayName, senha_hash: senhaHash, is_admin: !!isAdmin, criado: new Date().toISOString() });
  gravarUtilizadoresFicheiro(lista);
  return true;
}

async function buscarUtilizador(username) {
  await pronto;
  const u = String(username || '').toLowerCase().trim();
  if (!u) return null;

  if (pool) {
    try {
      const r = await pool.query(
        'SELECT username, display_name, senha_hash, is_admin FROM utilizadores WHERE username = $1',
        [u]
      );
      return r.rows[0] || null;
    } catch (e) { }
  }

  return lerUtilizadoresFicheiro().find(x => x.username === u) || null;
}

async function listarUtilizadores() {
  await pronto;
  if (pool) {
    try {
      const r = await pool.query(
        'SELECT username, display_name, is_admin, criado FROM utilizadores ORDER BY criado'
      );
      return r.rows;
    } catch (e) { }
  }
  return lerUtilizadoresFicheiro().map(({ username, display_name, is_admin, criado }) => ({
    username, display_name, is_admin, criado,
  }));
}

async function removerUtilizador(username) {
  await pronto;
  const u = String(username).toLowerCase().trim();
  if (pool) {
    try {
      await pool.query('DELETE FROM utilizadores WHERE username = $1', [u]);
      return true;
    } catch (e) { }
  }
  gravarUtilizadoresFicheiro(lerUtilizadoresFicheiro().filter(x => x.username !== u));
  return true;
}

async function mudarSenha(username, senhaHash) {
  await pronto;
  const u = String(username).toLowerCase().trim();
  if (pool) {
    try {
      await pool.query('UPDATE utilizadores SET senha_hash = $2 WHERE username = $1', [u, senhaHash]);
      return true;
    } catch (e) { }
  }
  const lista = lerUtilizadoresFicheiro();
  const alvo = lista.find(x => x.username === u);
  if (alvo) { alvo.senha_hash = senhaHash; gravarUtilizadoresFicheiro(lista); }
  return true;
}

async function marcarVisto(username) {
  await pronto;
  if (!pool) return;
  try {
    await pool.query('UPDATE utilizadores SET visto = now() WHERE username = $1', [username]);
  } catch (e) { }
}

// ------------------------------------------------------------------ convites

const FICHEIRO_CONVITES = path.join(__dirname, 'convites.json');

function lerConvitesFicheiro() {
  try {
    if (fs.existsSync(FICHEIRO_CONVITES)) {
      const l = JSON.parse(fs.readFileSync(FICHEIRO_CONVITES, 'utf8'));
      return Array.isArray(l) ? l : [];
    }
  } catch (e) { }
  return [];
}

async function criarConvite(codigo, dias, criadoPor) {
  await pronto;
  const expira = new Date(Date.now() + dias * 24 * 3600 * 1000);

  if (pool) {
    try {
      await pool.query(
        'INSERT INTO convites (codigo, expira, criado_por) VALUES ($1, $2, $3)',
        [codigo, expira.toISOString(), criadoPor || '']
      );
      return { codigo, expira };
    } catch (e) { }
  }

  const lista = lerConvitesFicheiro();
  lista.push({ codigo, expira: expira.toISOString(), usado: null, usado_por: null, criado_por: criadoPor || '' });
  fs.writeFileSync(FICHEIRO_CONVITES, JSON.stringify(lista, null, 2), 'utf8');
  return { codigo, expira };
}

async function buscarConvite(codigo) {
  await pronto;
  if (!codigo) return null;

  if (pool) {
    try {
      const r = await pool.query('SELECT * FROM convites WHERE codigo = $1', [String(codigo)]);
      return r.rows[0] || null;
    } catch (e) { }
  }
  return lerConvitesFicheiro().find(x => x.codigo === codigo) || null;
}

async function usarConvite(codigo, username) {
  await pronto;
  if (pool) {
    try {
      await pool.query('UPDATE convites SET usado = now(), usado_por = $2 WHERE codigo = $1', [codigo, username]);
      return true;
    } catch (e) { }
  }
  const lista = lerConvitesFicheiro();
  const c = lista.find(x => x.codigo === codigo);
  if (c) {
    c.usado = new Date().toISOString();
    c.usado_por = username;
    fs.writeFileSync(FICHEIRO_CONVITES, JSON.stringify(lista, null, 2), 'utf8');
  }
  return true;
}

async function listarConvites() {
  await pronto;
  if (pool) {
    try {
      const r = await pool.query('SELECT codigo, criado, expira, usado, usado_por FROM convites ORDER BY criado DESC LIMIT 30');
      return r.rows;
    } catch (e) { }
  }
  return lerConvitesFicheiro().slice(-30).reverse();
}

async function removerConvite(codigo) {
  await pronto;
  if (pool) {
    try {
      await pool.query('DELETE FROM convites WHERE codigo = $1', [codigo]);
      return true;
    } catch (e) { }
  }
  fs.writeFileSync(FICHEIRO_CONVITES,
    JSON.stringify(lerConvitesFicheiro().filter(x => x.codigo !== codigo), null, 2), 'utf8');
  return true;
}

// ------------------------------------------------------------------ varios

function modoArmazenamento() {
  return pool ? 'postgres' : 'arquivo local';
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

module.exports = {
  carregar, gravar,
  contarUtilizadores, criarUtilizador, buscarUtilizador, listarUtilizadores,
  removerUtilizador, mudarSenha, marcarVisto,
  criarConvite, buscarConvite, usarConvite, listarConvites, removerConvite,
  modoArmazenamento, diagnostico, pronto,
};
