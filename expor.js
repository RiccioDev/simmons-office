// Abre o túnel público (Cloudflare) para o escritório ficar acessível de qualquer lugar.
// Corre isto com o servidor já a funcionar (iniciar.bat noutra janela).

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORTA = 3000;
const CLOUDFLARED = path.join(__dirname, 'cloudflared.exe');

function verificarServidor() {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: PORTA, path: '/', timeout: 2500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

(async () => {
  console.log('\n  SIMMONS OFFICE — acesso de fora\n');

  if (!fs.existsSync(CLOUDFLARED)) {
    console.log('  Falta o ficheiro cloudflared.exe nesta pasta.');
    console.log('  Descarrega em: https://github.com/cloudflare/cloudflared/releases/latest');
    process.exit(1);
  }

  const vivo = await verificarServidor();
  if (!vivo) {
    console.log('  O servidor nao esta a correr na porta ' + PORTA + '.');
    console.log('  Abre primeiro o iniciar.bat (noutra janela) e volta a correr isto.\n');
    process.exit(1);
  }

  console.log('  Servidor local OK. A abrir o tunel...\n');

  const proc = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:' + PORTA, '--no-autoupdate'], {
    cwd: __dirname,
  });

  let achou = false;

  const ler = (buf) => {
    const txt = buf.toString();
    process.stdout.write(txt);
    if (achou) return;
    const m = txt.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) {
      achou = true;
      const url = m[0];
      fs.writeFileSync(path.join(__dirname, 'url_publica.txt'), url + '\n', 'utf8');
      console.log('\n  ================================================================');
      console.log('   O TEU ESCRITORIO ESTA ONLINE:');
      console.log('   ' + url);
      console.log('   (guarde tambem em url_publica.txt)');
      console.log('  ================================================================');
      console.log('   Partilha este link com a equipa.');
      console.log('   Mantem esta janela aberta enquanto quiseres o escritorio no ar.');
      console.log('   Ctrl+C fecha o acesso externo.\n');
    }
  };

  proc.stdout.on('data', ler);
  proc.stderr.on('data', ler);
  proc.on('exit', (code) => {
    console.log('\n  Tunel terminado (codigo ' + code + ').');
    process.exit(0);
  });

  process.on('SIGINT', () => { proc.kill(); process.exit(0); });
})();
