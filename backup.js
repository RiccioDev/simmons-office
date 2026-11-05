// Backup diario do estado do Simmons Office.
// Chama /api/backup no servidor online e guarda um JSON na pasta de backups.

const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = 'https://simmons-office.onrender.com';
const PASTA = path.join(__dirname, 'backups');
const MANTER = 30; // quantos backups guardar

function pedir(url, tentativas = 3) {
  return new Promise((resolve, reject) => {
    const t = (n) => {
      https.get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          if (n > 1) return setTimeout(() => t(n - 1), 8000);
          return reject(new Error('HTTP ' + res.statusCode));
        }
        let dados = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (dados += c));
        res.on('end', () => resolve(dados));
      }).on('error', (e) => {
        if (n > 1) return setTimeout(() => t(n - 1), 8000);
        reject(e);
      }).on('timeout', () => {
        if (n > 1) return setTimeout(() => t(n - 1), 8000);
        reject(new Error('timeout'));
      });
    };
    t(tentativas);
  });
}

(async () => {
  fs.mkdirSync(PASTA, { recursive: true });
  const agora = new Date();
  const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const alvo = path.join(PASTA, 'mesas-' + carimbo + '.json');

  try {
    const bruto = await pedir(SITE + '/api/backup');
    const obj = JSON.parse(bruto);
    fs.writeFileSync(alvo, JSON.stringify(obj, null, 1), 'utf8');

    const donos = (obj.mesas || []).filter((m) => m.owner).length;
    console.log('[' + agora.toLocaleString('pt-PT') + '] backup OK — ' +
      (obj.mesas || []).length + ' mesas, ' + donos + ' com dono -> ' + path.basename(alvo));

    // limpar os antigos
    const ficheiros = fs.readdirSync(PASTA)
      .filter((f) => f.startsWith('mesas-') && f.endsWith('.json'))
      .sort();
    while (ficheiros.length > MANTER) {
      const velho = ficheiros.shift();
      fs.unlinkSync(path.join(PASTA, velho));
      console.log('removido backup antigo: ' + velho);
    }
  } catch (e) {
    console.log('[' + agora.toLocaleString('pt-PT') + '] backup FALHOU: ' + e.message);
    process.exitCode = 1;
  }
})();
