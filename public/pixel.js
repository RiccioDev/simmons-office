// Personagens em pixel art (32x48).
// Cada boneco é composto pixel a pixel e ampliado sem suavização.

const Pixel = (() => {

  const LARG = 32;
  const ALT = 48;
  const cache = new Map();

  // ---------------------------------------------------------------- paletas
  const PELES = ['#f6d7b4', '#eec49b', '#dda87c', '#c68a5e', '#a96942', '#8a5030', '#6b3a21', '#4a2515'];
  const CABELOS = ['#171412', '#2f1c12', '#4a2b17', '#6d4526', '#9c6b3b', '#c99a5a', '#e0c07a', '#a8a8a8', '#8e3a2c'];
  const ROUPAS = ['#c99a33', '#2f8f86', '#3f6fa8', '#b8563b', '#7a4fa8', '#495f75',
                  '#a3526c', '#2f7a55', '#d9d4c8', '#363b45'];

  function tom(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function padrao() {
    return {
      genero: 'f', pele: 1, cabelo: 'longo', corCabelo: 1,
      roupa: 3, tipo: 'camisa', oculos: 'nenhum', barba: false,
    };
  }

  function novoDesenho() {
    const c = document.createElement('canvas');
    c.width = LARG; c.height = ALT;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
  }

  function px(g, x, y, w, h, cor) {
    g.fillStyle = cor;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------------------------------------------------------------- pernas
  // 0 = parado, 1 = passo esquerdo, 2 = passagem, 3 = passo direito
  function pernas(g, av, frame, c) {
    const calca = tom(c.roupa, 0.5);
    const calcaLuz = tom(c.roupa, 0.63);
    const sapato = '#23262c';
    const sapatoLuz = '#3b414a';

    let esq = 0, dir = 0, sobeEsq = 0, sobeDir = 0;

    if (frame === 1) { esq = -2; dir = 2; sobeEsq = 1; }
    else if (frame === 3) { esq = 2; dir = -2; sobeDir = 1; }
    else if (frame === 2 || frame === 4) { esq = -1; dir = 1; }

    px(g, 10 + esq, 34, 4, 8 - sobeEsq, calca);
    px(g, 10 + esq, 34, 1, 8 - sobeEsq, calcaLuz);
    px(g, 9 + esq, 42 - sobeEsq, 6, 3, sapato);
    px(g, 9 + esq, 42 - sobeEsq, 6, 1, sapatoLuz);

    px(g, 18 + dir, 34, 4, 8 - sobeDir, calca);
    px(g, 18 + dir, 34, 1, 8 - sobeDir, calcaLuz);
    px(g, 17 + dir, 42 - sobeDir, 6, 3, sapato);
    px(g, 17 + dir, 42 - sobeDir, 6, 1, sapatoLuz);

    if (av.tipo === 'vestido') {
      const cc = c.roupa;
      const luz = tom(cc, 1.16);
      const esc = tom(cc, 0.78);

      // a saia balança com o passo
      const bal = frame === 1 ? -1 : frame === 3 ? 1 : 0;

      // saia em A, a abrir aos poucos
      px(g, 10, 30, 12, 2, cc);
      px(g, 9, 32, 14, 2, cc);
      px(g, 8, 34, 16, 2, cc);
      px(g, 7 + bal, 36, 18, 2, cc);
      px(g, 7 + bal, 38, 18, 3, cc);
      px(g, 7 + bal, 40, 18, 1, tom(cc, 0.6));

      // dobras
      px(g, 10, 33, 1, 8, luz);
      px(g, 15, 34, 1, 7, esc);
      px(g, 21, 33, 1, 8, esc);
      px(g, 8, 39, 16, 1, tom(cc, 0.88));
    }
  }

  // ---------------------------------------------------------------- tronco
  function tronco(g, av, frame, c) {
    const base = c.roupa;
    const claro = tom(base, 1.15);
    const escuro = tom(base, 0.72);
    const tipo = av.tipo || 'camisa';

    let bEsq = 0, bDir = 0;
    if (frame === 1) { bEsq = 1; bDir = -1; }
    else if (frame === 3) { bEsq = -1; bDir = 1; }

    // tronco, 14 de largura
    px(g, 9, 20, 14, 14, base);
    px(g, 9, 20, 2, 14, claro);
    px(g, 21, 20, 2, 14, escuro);

    if (tipo === 'terno' || tipo === 'blazer') {
      const casaco = tom(base, 0.85);
      px(g, 9, 20, 14, 14, casaco);
      px(g, 12, 20, 8, 3, '#f2efe7');
      px(g, 15, 23, 2, 10, '#f2efe7');
      px(g, 12, 23, 3, 1, tom(casaco, 0.58));
      px(g, 17, 23, 3, 1, tom(casaco, 0.58));
      px(g, 10, 20, 2, 10, tom(casaco, 0.8));
      px(g, 20, 20, 2, 10, tom(casaco, 0.8));
      px(g, 9, 20, 1, 14, tom(casaco, 1.12));
      px(g, 22, 20, 1, 14, tom(casaco, 0.66));
      if (tipo === 'terno') {
        const gr = tom(base, 0.34);
        px(g, 15, 21, 2, 2, gr);
        px(g, 15, 23, 2, 8, gr);
        px(g, 15, 23, 1, 8, tom(gr, 1.32));
      }
      px(g, 15, 30, 2, 1, tom(casaco, 0.5));

    } else if (tipo === 'moletom') {
      px(g, 8, 19, 16, 3, tom(base, 0.68));
      px(g, 12, 23, 8, 6, escuro);
      px(g, 12, 23, 8, 1, tom(base, 0.52));
      px(g, 14, 21, 1, 4, '#efece4');
      px(g, 17, 21, 1, 4, '#efece4');

    } else if (tipo === 'uniforme') {
      px(g, 12, 20, 8, 3, tom(base, 0.55));   // gola
      px(g, 15, 21, 2, 2, base);
      px(g, 16, 23, 1, 9, tom(base, 0.72));   // carcela
      px(g, 11, 24, 3, 3, '#f2efe7');         // emblema
      px(g, 11, 24, 3, 1, '#cfd6e0');
      px(g, 9, 31, 14, 2, tom(base, 0.6));

    } else if (tipo === 'vestido') {
      px(g, 10, 20, 12, 10, base);          // corpete
      px(g, 13, 20, 6, 2, c.pele);          // decote
      px(g, 14, 22, 4, 1, c.pele);
      px(g, 10, 20, 1, 10, claro);
      px(g, 21, 20, 1, 10, escuro);
      px(g, 10, 28, 12, 2, tom(base, 0.7)); // cinta na cintura

    } else {
      px(g, 13, 20, 6, 2, tom(base, 0.62));
      px(g, 15, 21, 2, 1, tom(base, 0.9));
      px(g, 16, 22, 1, 2, '#e9e5dc');
      for (let i = 0; i < 3; i++) px(g, 15, 25 + i * 3, 1, 1, tom(base, 1.42));
    }

    // mangas e mãos
    if (tipo === 'vestido') {
      px(g, 9, 21 + bEsq, 2, 2, base);        // ombro
      px(g, 21, 21 + bDir, 2, 2, base);
      px(g, 7, 23 + bEsq, 2, 9, c.pele);      // braço à vista
      px(g, 23, 23 + bDir, 2, 9, tom(c.pele, 0.9));
      px(g, 7, 32 + bEsq, 2, 3, c.pele);
      px(g, 23, 32 + bDir, 2, 3, tom(c.pele, 0.9));
    } else {
      px(g, 7, 21 + bEsq, 2, 11, tom(base, 0.8));
      px(g, 23, 21 + bDir, 2, 11, tom(base, 0.62));
      px(g, 7, 21 + bEsq, 1, 11, tom(base, 0.95));
      px(g, 7, 32 + bEsq, 2, 3, c.pele);
      px(g, 23, 32 + bDir, 2, 3, c.pele);
    }
  }

  // ---------------------------------------------------------------- cabeça
  function cabeca(g, av, c) {
    const pele = c.pele;
    const sombra = tom(pele, 0.84);
    const luz = tom(pele, 1.09);
    const escuro = tom(pele, 0.62);

    // pescoço
    px(g, 14, 18, 4, 3, tom(pele, 0.9));
    px(g, 14, 18, 1, 3, sombra);

    // cabeça
    px(g, 10, 6, 12, 12, pele);
    px(g, 10, 6, 2, 12, luz);
    px(g, 20, 6, 2, 12, sombra);
    px(g, 10, 17, 12, 1, tom(pele, 0.78));

    // orelhas
    px(g, 9, 11, 1, 3, sombra);
    px(g, 22, 11, 1, 3, sombra);

    // olhos
    const olhoBorda = tom(pele, 0.68);
    px(g, 12, 10, 3, 1, olhoBorda);
    px(g, 17, 10, 3, 1, olhoBorda);
    px(g, 12, 11, 3, 2, '#f2f2f0');
    px(g, 17, 11, 3, 2, '#f2f2f0');
    px(g, 13, 11, 1, 2, '#20242a');
    px(g, 18, 11, 1, 2, '#20242a');

    // sobrancelhas
    const sob = tom(c.cabelo, 0.75);
    px(g, 12, 9, 3, 1, sob);
    px(g, 17, 9, 3, 1, sob);

    // nariz
    px(g, 15, 13, 2, 1, sombra);
    px(g, 15, 14, 1, 1, escuro);

    // boca (escondida quando há barba)
    if (!av.barba) px(g, 15, 15, 2, 1, tom(pele, 0.52));

    if (av.barba) barba(g, av, c);
    cabelo(g, av, c);
    oculos(g, av);
  }

  // barba que acompanha o maxilar
  function barba(g, av, c) {
    const b = c.cabelo;
    const be = tom(b, 0.78);
    const peleEscura = tom(c.pele, 0.6);

    px(g, 13, 14, 6, 1, b);
    px(g, 13, 15, 2, 1, b);
    px(g, 17, 15, 2, 1, b);

    px(g, 10, 13, 1, 4, be);
    px(g, 21, 13, 1, 4, be);

    px(g, 11, 16, 2, 2, b);
    px(g, 19, 16, 2, 2, b);
    px(g, 13, 17, 6, 1, b);
    px(g, 14, 18, 4, 1, be);

    px(g, 15, 16, 2, 1, peleEscura);
  }

  function cabelo(g, av, c) {
    const cor = c.cabelo;
    const escuro = tom(cor, 0.72);
    const claro = tom(cor, 1.2);
    const estilo = av.cabelo || 'curto';

    if (estilo === 'longo' || estilo === 'rabo') {
      px(g, 9, 8, 2, 14, escuro);
      px(g, 21, 8, 2, 14, escuro);
    }
    if (estilo === 'rabo') {
      px(g, 21, 14, 2, 9, cor);
      px(g, 21, 21, 2, 2, escuro);
    }

    if (estilo === 'careca') {
      px(g, 10, 6, 12, 1, tom(c.pele, 0.92));
      return;
    }

    if (estilo === 'afro') {
      px(g, 8, 3, 16, 7, cor);
      px(g, 7, 5, 2, 9, cor);
      px(g, 23, 5, 2, 9, cor);
      px(g, 10, 2, 12, 2, claro);
      px(g, 7, 11, 2, 3, escuro);
      px(g, 23, 11, 2, 3, escuro);
      px(g, 12, 5, 8, 1, escuro);
      return;
    }

    px(g, 10, 4, 12, 3, cor);
    px(g, 9, 5, 1, 5, cor);
    px(g, 22, 5, 1, 5, cor);
    px(g, 10, 3, 8, 1, claro);
    px(g, 16, 6, 6, 1, escuro);

    if (estilo === 'longo') {
      px(g, 9, 6, 2, 12, cor);
      px(g, 21, 6, 2, 12, cor);
      px(g, 9, 16, 2, 2, escuro);
      px(g, 21, 16, 2, 2, escuro);
    } else if (estilo === 'coque') {
      px(g, 14, 1, 4, 3, cor);
      px(g, 15, 1, 2, 1, claro);
      px(g, 13, 4, 6, 1, escuro);
    } else if (estilo === 'franja') {
      px(g, 10, 6, 12, 2, cor);
      px(g, 11, 8, 3, 1, cor);
      px(g, 16, 8, 3, 1, cor);
    } else if (estilo === 'curto') {
      px(g, 10, 6, 2, 1, cor);
      px(g, 20, 6, 2, 1, cor);
    }
  }

  function oculos(g, av) {
    const t = av.oculos;
    if (!t || t === 'nenhum') return;

    if (t === 'redondo') {
      const a = '#2a2e35';
      px(g, 11, 10, 1, 3, a); px(g, 15, 10, 1, 3, a);
      px(g, 12, 9, 3, 1, a);  px(g, 12, 13, 3, 1, a);
      px(g, 16, 10, 1, 3, a); px(g, 20, 10, 1, 3, a);
      px(g, 17, 9, 3, 1, a);  px(g, 17, 13, 3, 1, a);
      px(g, 15, 11, 1, 1, a);
      px(g, 9, 11, 1, 1, a);
      px(g, 22, 11, 1, 1, a);
      px(g, 12, 10, 3, 3, 'rgba(190,225,240,.14)');
      px(g, 17, 10, 3, 3, 'rgba(190,225,240,.14)');
      return;
    }

    if (t === 'escuro') {
      px(g, 11, 10, 4, 3, '#1a1d22');
      px(g, 16, 10, 4, 3, '#1a1d22');
      px(g, 11, 10, 4, 1, '#2b3038');
      px(g, 16, 10, 4, 1, '#2b3038');
      px(g, 15, 11, 1, 1, '#2b3038');
      px(g, 9, 11, 2, 1, '#1a1d22');
      px(g, 20, 11, 2, 1, '#1a1d22');
      px(g, 12, 11, 1, 1, 'rgba(255,255,255,.38)');
      px(g, 17, 11, 1, 1, 'rgba(255,255,255,.38)');
      return;
    }

    // sol
    px(g, 10, 10, 5, 3, 'rgba(20,26,34,.86)');
    px(g, 16, 10, 5, 3, 'rgba(20,26,34,.86)');
    px(g, 10, 10, 5, 1, '#2b313a');
    px(g, 16, 10, 5, 1, '#2b313a');
    px(g, 15, 11, 1, 1, '#2b313a');
    px(g, 9, 11, 1, 1, '#2b313a');
    px(g, 21, 11, 1, 1, '#2b313a');
    px(g, 11, 11, 1, 1, 'rgba(255,255,255,.5)');
    px(g, 17, 11, 1, 1, 'rgba(255,255,255,.5)');
  }

  function sombra(g, frame) {
    const larg = (frame === 1 || frame === 3) ? 16 : 14;
    px(g, 16 - larg / 2, 46, larg, 2, 'rgba(0,0,0,.32)');
  }

  function sprite(av, frame = 0) {
    const chave = JSON.stringify([av, frame]);
    if (cache.has(chave)) return cache.get(chave);

    const { c: canvas, g } = novoDesenho();
    const cores = {
      pele: PELES[(av.pele || 0) % PELES.length],
      cabelo: CABELOS[(av.corCabelo || 0) % CABELOS.length],
      roupa: ROUPAS[(av.roupa || 0) % ROUPAS.length],
    };

    sombra(g, frame);
    pernas(g, av, frame, cores);

    // balanço do corpo nos passos
    g.save();
    if (frame === 1 || frame === 3) g.translate(0, -1);
    tronco(g, av, frame, cores);
    cabeca(g, av, cores);
    g.restore();

    cache.set(chave, canvas);
    if (cache.size > 400) cache.delete(cache.keys().next().value);
    return canvas;
  }

  function desenhar(ctx, x, y, av, opcoes = {}) {
    const frame = opcoes.andando ? 1 + Math.min(3, ((opcoes.passo || 0) * 4) | 0) : 0;
    const img = sprite(av || padrao(), frame);
    const escala = opcoes.escala || 2;
    const largura = LARG * escala;
    const altura = ALT * escala;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (opcoes.dir === -1) {
      ctx.translate(Math.round(x), 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, Math.round(-largura / 2), Math.round(y - altura), largura, altura);
    } else {
      ctx.drawImage(img, Math.round(x - largura / 2), Math.round(y - altura), largura, altura);
    }
    ctx.restore();
  }

  return { desenhar, sprite, padrao, PELES, CABELOS, ROUPAS, tom, LARG, ALT };
})();

if (typeof window !== 'undefined') window.Pixel = Pixel;
