// Personagens em pixel art.
// Desenhados num canvas pequeno (32x44) com coordenadas inteiras e depois
// ampliados sem suavização — é o que dá o aspecto de pixel art a sério.

const Pixel = (() => {

  const LARG = 32;
  const ALT = 44;

  const cache = new Map();

  // ---------------------------------------------------------------- paletas
  const PELES = ['#f8d9b8', '#eec39a', '#dba57a', '#c08552', '#9a5f3a', '#74432a', '#54301c', '#3b2113'];
  const CABELOS = ['#141414', '#2c1a0f', '#4a2c18', '#6f4626', '#a4703c', '#d9b06a', '#b8b8b8', '#8d3a2c', '#4b3f72'];
  const ROUPAS = ['#c9982b', '#2f8f86', '#3f6fa8', '#b8563b', '#7a4fa8', '#4a6076', '#a3526c', '#2f7a55',
                  '#d8d3c8', '#3a3f4a'];

  function tom(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function padrao() {
    return {
      genero: 'f', pele: 1, cabelo: 'longo', corCabelo: 1,
      roupa: 3, tipo: 'camisa', oculos: 'nenhum', barba: false,
    };
  }

  // ---------------------------------------------------------------- desenho
  // Uma "folha" onde desenhamos ao pixel.
  function novoDesenho() {
    const c = document.createElement('canvas');
    c.width = LARG;
    c.height = ALT;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
  }

  function px(g, x, y, w, h, cor) {
    g.fillStyle = cor;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // ---------- peças ----------
  function pernas(g, av, frame, cores) {
    const calca = cores.calca;
    const sapato = cores.sapato;

    const passo = [0, 1, 0, -1][frame % 4];

    // perna esquerda
    px(g, 11, 32, 4, 7 - Math.abs(passo), calca);
    px(g, 10, 39 - Math.abs(passo), 6, 3, sapato);
    // perna direita
    px(g, 17, 32 + (passo > 0 ? 1 : 0), 4, 7 - Math.abs(passo), tom(calca, 0.92));
    px(g, 16, 39 - Math.abs(passo) + (passo > 0 ? 1 : 0), 6, 3, sapato);

    if (av.tipo === 'vestido') {
      // saia por cima das pernas
      const c = cores.roupa;
      px(g, 9, 28, 14, 8, c);
      px(g, 8, 34, 16, 3, tom(c, 0.86));
      px(g, 8, 36, 16, 1, tom(c, 0.62));
    }
  }

  function tronco(g, av, cores) {
    const c = cores.roupa;
    const escuro = tom(c, 0.72);
    const claro = tom(c, 1.12);

    // corpo
    px(g, 10, 19, 12, 14, c);
    px(g, 10, 19, 2, 14, claro);
    px(g, 20, 19, 2, 14, escuro);

    const tipo = av.tipo || 'camisa';

    if (tipo === 'terno' || tipo === 'blazer') {
      const casaco = tom(c, 0.82);
      px(g, 10, 19, 12, 14, casaco);
      // camisa branca em V
      px(g, 14, 19, 4, 6, '#f4f1ea');
      px(g, 15, 25, 2, 8, '#f4f1ea');
      // lapelas
      px(g, 12, 19, 2, 7, tom(casaco, 0.8));
      px(g, 18, 19, 2, 7, tom(casaco, 0.8));
      // sombra lateral
      px(g, 20, 19, 2, 14, tom(casaco, 0.7));
      if (tipo === 'terno') {
        const gravata = tom(cores.roupa, 0.35);
        px(g, 15, 20, 2, 2, gravata);
        px(g, 15, 22, 2, 7, gravata);
        px(g, 15, 22, 1, 7, tom(gravata, 1.25));
      }

    } else if (tipo === 'moletom') {
      px(g, 10, 19, 12, 14, c);
      // bolso
      px(g, 12, 27, 8, 5, escuro);
      px(g, 12, 27, 8, 1, tom(c, 0.6));
      // cordões
      px(g, 14, 20, 1, 5, '#f0ede6');
      px(g, 17, 20, 1, 5, '#f0ede6');
      // capuz atrás dos ombros
      px(g, 9, 18, 14, 3, tom(c, 0.68));

    } else if (tipo === 'uniforme') {
      // polo com gola e faixa
      px(g, 10, 19, 12, 3, tom(c, 1.12));
      px(g, 13, 22, 6, 1, tom(c, 0.55));
      px(g, 15, 23, 2, 2, '#f4f1ea');
      px(g, 10, 30, 12, 2, tom(c, 0.6));

    } else if (tipo === 'vestido') {
      px(g, 10, 19, 12, 11, c);
      // decote
      px(g, 14, 19, 4, 3, cores.pele);
      px(g, 10, 19, 3, 11, claro);
      px(g, 19, 19, 3, 11, escuro);

    } else {
      // camisa
      px(g, 10, 19, 12, 14, c);
      px(g, 10, 19, 2, 14, claro);
      px(g, 20, 19, 2, 14, escuro);
      // gola
      px(g, 13, 19, 6, 2, tom(c, 0.66));
      px(g, 14, 21, 4, 1, tom(c, 0.85));
      // botões
      for (let i = 0; i < 3; i++) px(g, 15, 24 + i * 3, 1, 1, tom(c, 1.35));
    }

    // braços
    px(g, 8, 20, 2, 11, tom(c, 0.78));
    px(g, 22, 20, 2, 11, tom(c, 0.62));
    // mãos
    px(g, 8, 31, 2, 3, cores.pele);
    px(g, 22, 31, 2, 3, cores.pele);
  }

  function cabeca(g, av, cores) {
    const pele = cores.pele;
    const sombra = tom(pele, 0.86);
    const luz = tom(pele, 1.08);

    // pescoço
    px(g, 14, 16, 4, 3, sombra);

    // cabeça 12x13
    px(g, 10, 5, 12, 12, pele);
    px(g, 10, 5, 2, 12, luz);
    px(g, 20, 5, 2, 12, sombra);
    // orelhas
    px(g, 9, 10, 1, 3, sombra);
    px(g, 22, 10, 1, 3, sombra);

    // olhos
    px(g, 13, 10, 2, 2, '#f7f7f7');
    px(g, 17, 10, 2, 2, '#f7f7f7');
    px(g, 14, 10, 1, 2, '#20242a');
    px(g, 18, 10, 1, 2, '#20242a');
    // sobrancelhas
    px(g, 13, 8, 2, 1, tom(cores.cabelo, 0.85));
    px(g, 17, 8, 2, 1, tom(cores.cabelo, 0.85));
    // nariz e boca
    px(g, 16, 12, 1, 1, sombra);
    px(g, 15, 14, 3, 1, tom(pele, 0.6));

    if (av.barba) {
      px(g, 13, 13, 6, 3, tom(cores.cabelo, 0.9));
      px(g, 15, 13, 2, 1, tom(pele, 0.6));
    }

    cabelo(g, av, cores);
    oculos(g, av);
  }

  function cabelo(g, av, cores) {
    const c = cores.cabelo;
    const escuro = tom(c, 0.75);
    const claro = tom(c, 1.15);
    const estilo = av.cabelo || 'curto';

    if (estilo === 'careca') {
      px(g, 10, 5, 12, 1, tom(cores.pele, 0.94));
      return;
    }

    if (estilo === 'afro') {
      px(g, 8, 2, 16, 8, c);
      px(g, 7, 4, 2, 10, c);
      px(g, 23, 4, 2, 10, c);
      px(g, 10, 1, 12, 2, claro);
      px(g, 7, 10, 2, 3, escuro);
      px(g, 23, 10, 2, 3, escuro);
      return;
    }

    // base: topo da cabeça
    px(g, 10, 3, 12, 4, c);
    px(g, 9, 4, 1, 6, c);
    px(g, 22, 4, 1, 6, c);
    px(g, 10, 3, 6, 1, claro);
    px(g, 16, 5, 6, 2, escuro);

    if (estilo === 'longo') {
      px(g, 9, 8, 2, 12, c);
      px(g, 21, 8, 2, 12, c);
      px(g, 9, 18, 2, 2, escuro);
      px(g, 21, 18, 2, 2, escuro);
    } else if (estilo === 'coque') {
      px(g, 14, 0, 4, 3, c);
      px(g, 15, 0, 2, 1, claro);
    } else if (estilo === 'franja') {
      px(g, 10, 5, 12, 2, c);
      px(g, 11, 7, 4, 1, escuro);
    } else if (estilo === 'rabo') {
      px(g, 22, 8, 2, 9, c);
      px(g, 22, 16, 2, 3, escuro);
      px(g, 10, 3, 12, 3, c);
    } else if (estilo === 'curto') {
      px(g, 10, 5, 3, 1, c);
      px(g, 19, 5, 3, 1, c);
    }
  }

  function oculos(g, av) {
    const t = av.oculos;
    if (!t || t === 'nenhum') return;

    if (t === 'escuro') {
      px(g, 12, 9, 4, 3, '#1b1e24');
      px(g, 16, 9, 4, 3, '#1b1e24');
      px(g, 16, 10, 1, 1, '#3a4048');
      return;
    }
    if (t === 'sol') {
      px(g, 12, 9, 4, 3, 'rgba(20,26,34,.85)');
      px(g, 16, 9, 4, 3, 'rgba(20,26,34,.85)');
      px(g, 12, 9, 4, 1, '#2a2f38');
      px(g, 16, 9, 4, 1, '#2a2f38');
      return;
    }
    // redondo
    px(g, 12, 8, 4, 1, '#2b2f36');
    px(g, 12, 12, 4, 1, '#2b2f36');
    px(g, 11, 9, 1, 3, '#2b2f36');
    px(g, 16, 9, 1, 3, '#2b2f36');

    px(g, 16, 8, 4, 1, '#2b2f36');
    px(g, 16, 12, 4, 1, '#2b2f36');
    px(g, 20, 9, 1, 3, '#2b2f36');
    px(g, 15, 10, 1, 1, '#2b2f36');
  }

  function sombra(g) {
    px(g, 9, 41, 14, 2, 'rgba(0,0,0,.28)');
    px(g, 8, 42, 16, 1, 'rgba(0,0,0,.16)');
  }

  // ---------------------------------------------------------------- sprite
  function sprite(av, frame = 0) {
    const chave = JSON.stringify([av, frame]);

    if (cache.has(chave)) return cache.get(chave);

    const { c, g } = novoDesenho();
    const cores = {
      pele: PELES[av.pele % PELES.length],
      cabelo: CABELOS[av.corCabelo % CABELOS.length],
      roupa: ROUPAS[av.roupa % ROUPAS.length],
      calca: tom(ROUPAS[av.roupa % ROUPAS.length], 0.55),
      sapato: '#22252b',
    };

    sombra(g);

    // silhueta escura (1px) para o boneco se destacar do chão
    const contorno = 'rgba(12,10,8,.55)';
    px(g, 9, 18, 14, 16, contorno);   // tronco
    px(g, 7, 19, 2, 13, contorno);    // braço esquerdo
    px(g, 23, 19, 2, 13, contorno);   // braço direito
    px(g, 9, 4, 14, 14, contorno);    // cabeça
    px(g, 10, 31, 12, 12, contorno);  // pernas

    pernas(g, av, frame, cores);
    tronco(g, av, cores);
    cabeca(g, av, cores);

    cache.set(chave, c);
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    return c;
  }

  // desenha o personagem no chão (x,y = pés)
  function desenhar(ctx, x, y, av, opcoes = {}) {
    const frame = opcoes.andando ? (opcoes.passo || 0) * 4 | 0 : 0;
    const img = sprite(av || padrao(), frame);
    const escala = opcoes.escala || 2;

    const largura = LARG * escala;
    const altura = ALT * escala;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (opcoes.dir === -1) {
      ctx.translate(x, 0);
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
