// Desenho do escritório e dos personagens (canvas 2D).
// Tudo desenhado em código: não há imagens para carregar.

const Visual = (() => {

  // ---------------------------------------------------------------- paletas
  const PELES = ['#f5d9bd', '#e8bd95', '#d19a6b', '#b07b4f', '#8a5535', '#5f3a22'];
  const CABELOS = ['#171717', '#3b2314', '#6b3f1d', '#a86b2d', '#d9b26b', '#9a9a9a', '#8e3b2e'];
  const ROUPAS = ['#c9a227', '#2a9d8f', '#4a7fb5', '#c2603f', '#8a5bb0', '#4f6b8a', '#a85b74', '#3f8f6d'];

  function corPele(i) { return PELES[i % PELES.length]; }
  function corCabelo(i) { return CABELOS[i % CABELOS.length]; }
  function corRoupa(i) { return ROUPAS[i % ROUPAS.length]; }

  function padrao() {
    return { genero: 'f', pele: 1, cabelo: 'longo', corCabelo: 1, roupa: 3, tipo: 'camisa', oculos: 'nenhum' };
  }

  // escurece/clareia uma cor hex
  function tom(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---------------------------------------------------------------- personagem
  // (x,y) = ponto dos pés. escala 1 = tamanho normal (≈48px de altura).
  function personagem(ctx, x, y, a, opcoes = {}) {
    const av = a || padrao();
    const dir = opcoes.dir === -1 ? -1 : 1;
    const passo = opcoes.passo || 0;
    const andando = !!opcoes.andando;
    const sentado = !!opcoes.sentado;

    const pele = corPele(av.pele || 0);
    const cabelo = corCabelo(av.corCabelo || 0);
    const roupa = corRoupa(av.roupa || 0);
    const roupaEscura = tom(roupa, 0.78);
    const peleEscura = tom(pele, 0.86);

    const balanco = andando ? Math.sin(passo * Math.PI * 2) : 0;
    const sobe = andando ? Math.abs(Math.sin(passo * Math.PI * 2)) * 1.6 : 0;

    const esc = opcoes.escala || 1;
    ctx.save();
    ctx.translate(x, y - sobe);
    if (esc !== 1) ctx.scale(esc, esc);

    // sombra
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fill();

    // pernas (só se não estiver sentado)
    if (!sentado) {
      ctx.fillStyle = tom(roupa, 0.55);
      ctx.beginPath();
      ctx.roundRect(-7 + balanco * 3, -13, 6, 14, 3);
      ctx.roundRect(1 - balanco * 3, -13, 6, 14, 3);
      ctx.fill();

      // sapatos
      ctx.fillStyle = '#22262d';
      ctx.beginPath();
      ctx.roundRect(-7.5 + balanco * 3, -3, 7, 4, 2);
      ctx.roundRect(0.5 - balanco * 3, -3, 7, 4, 2);
      ctx.fill();
    }

    // tronco (varia com o tipo de roupa)
    const largura = av.genero === 'm' ? 15 : 13;
    desenharTronco(ctx, av, largura, roupa, roupaEscura, pele);

    // braços
    ctx.fillStyle = roupaEscura;
    ctx.beginPath();
    ctx.roundRect(-largura - 4 + balanco * 2, -37, 5, 20, 2.5);
    ctx.roundRect(largura - 1 - balanco * 2, -37, 5, 20, 2.5);
    ctx.fill();

    // mãos
    ctx.fillStyle = pele;
    ctx.beginPath();
    ctx.arc(-largura - 1.5 + balanco * 2, -16, 2.6, 0, Math.PI * 2);
    ctx.arc(largura + 1.5 - balanco * 2, -16, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // pescoço
    ctx.fillStyle = peleEscura;
    ctx.beginPath();
    ctx.roundRect(-3.5, -44, 7, 6, 2);
    ctx.fill();

    // cabeça
    const cy = -52;
    ctx.beginPath();
    ctx.arc(0, cy, 11.5, 0, Math.PI * 2);
    ctx.fillStyle = pele;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // orelhas
    ctx.beginPath();
    ctx.arc(-11 + dir * 0.5, cy + 1, 2.4, 0, Math.PI * 2);
    ctx.arc(11 + dir * 0.5, cy + 1, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = peleEscura;
    ctx.fill();

    // cabelo
    desenharCabelo(ctx, av, cy, cabelo, dir);

    // olhos e boca (só de frente)
    if (opcoes.costas !== true) {
      // olhos: branco + pupila (funciona em pele clara e escura)
      for (const dx of [-4.3, 4.3]) {
        ctx.fillStyle = '#f7f7f7';
        ctx.beginPath();
        ctx.ellipse(dx + dir * 0.6, cy + 1, 2.3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#20242a';
        ctx.beginPath();
        ctx.arc(dx + dir * 1.1, cy + 1.3, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // sobrancelhas
      ctx.strokeStyle = 'rgba(40,30,22,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6.4, cy - 3.2); ctx.lineTo(-2.6, cy - 3.6);
      ctx.moveTo(2.6, cy - 3.6); ctx.lineTo(6.4, cy - 3.2);
      ctx.stroke();

      // boca
      ctx.strokeStyle = 'rgba(90,50,40,.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(dir * 1, cy + 4.6, 2.8, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();

      desenharOculos(ctx, av.oculos, cy, dir);
    }

    ctx.restore();
  }

  function desenharTronco(ctx, av, largura, roupa, roupaEscura, pele) {
    const tipo = av.tipo || 'camisa';

    // base: corpo
    ctx.fillStyle = roupa;
    ctx.beginPath();
    ctx.roundRect(-largura, -40, largura * 2, 30, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (tipo === 'terno' || tipo === 'blazer') {
      // camisa branca em V
      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath();
      ctx.moveTo(-6, -40);
      ctx.lineTo(6, -40);
      ctx.lineTo(0, -20);
      ctx.closePath();
      ctx.fill();

      // lapelas
      ctx.fillStyle = roupaEscura;
      ctx.beginPath();
      ctx.moveTo(-largura, -40);
      ctx.lineTo(-4, -40);
      ctx.lineTo(0, -18);
      ctx.lineTo(-largura + 3, -22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(largura, -40);
      ctx.lineTo(4, -40);
      ctx.lineTo(0, -18);
      ctx.lineTo(largura - 3, -22);
      ctx.closePath();
      ctx.fill();

      if (tipo === 'terno') {
        // gravata
        ctx.fillStyle = tom(roupa, 0.45);
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(2.6, -31);
        ctx.lineTo(2, -16);
        ctx.lineTo(0, -12);
        ctx.lineTo(-2, -16);
        ctx.lineTo(-2.6, -31);
        ctx.closePath();
        ctx.fill();
      }

      // botão do casaco
      ctx.fillStyle = tom(roupa, 0.5);
      ctx.beginPath();
      ctx.arc(0, -12, 1.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (tipo === 'moletom') {
      // capuz atrás do pescoço
      ctx.fillStyle = roupaEscura;
      ctx.beginPath();
      ctx.ellipse(0, -40, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // bolso canguru
      ctx.fillStyle = roupaEscura;
      ctx.beginPath();
      ctx.roundRect(-9, -24, 18, 10, 3);
      ctx.fill();

      // cordões
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -36); ctx.lineTo(-4, -28);
      ctx.moveTo(3, -36); ctx.lineTo(4, -28);
      ctx.stroke();

    } else if (tipo === 'vestido') {
      // decote
      ctx.fillStyle = pele;
      ctx.beginPath();
      ctx.moveTo(-6, -40);
      ctx.lineTo(6, -40);
      ctx.lineTo(0, -33);
      ctx.closePath();
      ctx.fill();

      // saia a rodear as pernas
      ctx.fillStyle = roupa;
      ctx.beginPath();
      ctx.moveTo(-largura, -14);
      ctx.lineTo(largura, -14);
      ctx.lineTo(largura + 4, 2);
      ctx.lineTo(-largura - 4, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.20)';
      ctx.lineWidth = 1;
      ctx.stroke();

    } else {
      // camisa: gola simples
      ctx.fillStyle = roupaEscura;
      ctx.beginPath();
      ctx.roundRect(-largura + 2, -40, largura * 2 - 4, 6, 4);
      ctx.fill();

      // botões
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (const by of [-30, -23]) {
        ctx.beginPath();
        ctx.arc(0, by, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function desenharOculos(ctx, tipo, cy, dir) {
    if (!tipo || tipo === 'nenhum') return;

    if (tipo === 'escuro') {
      ctx.fillStyle = 'rgba(24,26,32,.92)';
      ctx.beginPath();
      ctx.roundRect(-9, cy - 3.4, 8, 5.6, 2);
      ctx.roundRect(1, cy - 3.4, 8, 5.6, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(24,26,32,.92)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1, cy - 1.4);
      ctx.lineTo(1, cy - 1.4);
      ctx.stroke();
      return;
    }

    // redondos / sol: aros
    ctx.strokeStyle = tipo === 'sol' ? 'rgba(30,24,18,.95)' : 'rgba(40,36,30,.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4.4 + dir * 0.6, cy + 1, 3.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(4.4 + dir * 0.6, cy + 1, 3.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1, cy + 0.6);
    ctx.lineTo(1, cy + 0.6);
    ctx.stroke();

    if (tipo === 'sol') {
      ctx.fillStyle = 'rgba(20,24,30,.75)';
      ctx.beginPath();
      ctx.arc(-4.4 + dir * 0.6, cy + 1, 3.2, 0, Math.PI * 2);
      ctx.arc(4.4 + dir * 0.6, cy + 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function desenharCabelo(ctx, av, cy, cor, dir) {
    const estilo = av.cabelo || 'curto';
    ctx.fillStyle = cor;

    if (estilo === 'careca') return;

    if (estilo === 'afro') {
      ctx.beginPath();
      ctx.arc(0, cy - 3, 14, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-11, cy - 1, 6, 0, Math.PI * 2);
      ctx.arc(11, cy - 1, 6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // base do cabelo: metade de cima da cabeça
    ctx.beginPath();
    ctx.arc(0, cy, 12, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(11, cy + 1);
    ctx.lineTo(-11, cy + 1);
    ctx.closePath();
    ctx.fill();

    if (estilo === 'longo') {
      ctx.beginPath();
      ctx.roundRect(-13, cy - 2, 6, 20, 3);
      ctx.roundRect(7, cy - 2, 6, 20, 3);
      ctx.fill();
    }

    if (estilo === 'coque') {
      ctx.beginPath();
      ctx.arc(0, cy - 13, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (estilo === 'franja') {
      ctx.beginPath();
      ctx.roundRect(-11, cy - 8, 22, 7, 3);
      ctx.fill();
    }

    // brilho
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath();
    ctx.ellipse(-3, cy - 7, 5, 2.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------- ambiente
  // ============================================================ PLANTA DO ESCRITÓRIO
  // Zonas de piso, paredes interiores (com vãos de porta) e rótulos de equipa.
  const MAPA = {
    pisos: [
      { x: 200, y: 92,  w: 270, h: 238, estilo: 'lajota' },   // gabinete
      { x: 520, y: 92,  w: 500, h: 208, estilo: 'carpete' },  // copa
      { x: 1080, y: 92, w: 300, h: 338, estilo: 'xadrez' },   // reunião
      { x: 380, y: 340, w: 560, h: 360, estilo: 'lajota' },   // estações
      { x: 40,  y: 700, w: 320, h: 260, estilo: 'carpete' },  // recepção
      { x: 1020, y: 700, w: 360, h: 260, estilo: 'carpete' }, // lounge
      { x: 470, y: 716, w: 420, h: 226, estilo: 'carpete' },  // zona tranquila
    ],
    paredes: [
      // gabinete (parede de alvenaria, porta ao centro)
      { x: 200, y: 92,  w: 16,  h: 238 },
      { x: 454, y: 92,  w: 16,  h: 238 },
      { x: 200, y: 314, w: 110, h: 16 },
      { x: 374, y: 314, w: 96,  h: 16 },
      // sala de reunião (parede de vidro, porta de correr)
      { x: 1080, y: 92,  w: 10, h: 200, vidro: true },
      { x: 1080, y: 372, w: 10, h: 58,  vidro: true },
      { x: 1080, y: 420, w: 300, h: 10, vidro: true },
      // meia parede entre estações e lounge
      { x: 1000, y: 700, w: 16, h: 130 },
    ],
    salas: [
      { x: 200,  y: 92,  w: 270, h: 238, nome: 'GABINETE' },
      { x: 520,  y: 92,  w: 500, h: 208, nome: 'COPA' },
      { x: 1080, y: 92,  w: 300, h: 338, nome: 'SALA DE REUNIÃO' },
      { x: 380,  y: 340, w: 560, h: 360, nome: 'ESTAÇÕES DE TRABALHO' },
      { x: 40,   y: 700, w: 320, h: 260, nome: 'RECEPÇÃO' },
      { x: 1020, y: 700, w: 360, h: 260, nome: 'LOUNGE' },
      { x: 470, y: 716, w: 420, h: 226, nome: 'ZONA TRANQUILA' },
    ],
  };

  // ---------------------------------------------------------------- chão
  function chao(ctx, largura, altura) {
    // base: tábuas compridas (corredores e circulação)
    const tabua = 36;
    for (let y = 0, linha = 0; y < altura; y += tabua, linha++) {
      ctx.fillStyle = linha % 2 ? '#96764f' : '#9c7b55';
      ctx.fillRect(0, y, largura, tabua);
      ctx.fillStyle = 'rgba(70,48,28,.20)';
      ctx.fillRect(0, y + tabua - 1, largura, 1);
      ctx.fillStyle = 'rgba(120,88,54,.16)';
      for (let x = (linha % 3) * 90; x < largura; x += 260) {
        ctx.fillRect(x, y + 10 + (linha % 2) * 8, 120, 1);
        ctx.fillRect(x + 40, y + 22, 70, 1);
      }
      ctx.fillStyle = 'rgba(255,240,214,.05)';
      ctx.fillRect(0, y + 1, largura, 1);
    }

  }

  // zonas de piso próprias (chamadas em coordenadas do mapa, sem translate)
  function pisosZonas(ctx) {
    for (const z of MAPA.pisos) desenharPiso(ctx, z);
  }

  function desenharPiso(ctx, z) {
    const { x, y, w, h, estilo } = z;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    if (estilo === 'lajota') {
      ctx.fillStyle = '#5f6874';
      ctx.fillRect(x, y, w, h);
      for (let ty = y; ty < y + h; ty += 32) {
        for (let tx = x; tx < x + w; tx += 32) {
          const alt = ((tx / 32 + ty / 32) % 2) ? '#666f7c' : '#5b6470';
          ctx.fillStyle = alt;
          ctx.fillRect(tx, ty, 32, 32);
        }
      }
      ctx.strokeStyle = 'rgba(30,36,44,.35)';
      ctx.lineWidth = 1;
      for (let ty = y; ty <= y + h; ty += 32) { ctx.beginPath(); ctx.moveTo(x, ty + .5); ctx.lineTo(x + w, ty + .5); ctx.stroke(); }
      for (let tx = x; tx <= x + w; tx += 32) { ctx.beginPath(); ctx.moveTo(tx + .5, y); ctx.lineTo(tx + .5, y + h); ctx.stroke(); }
    } else if (estilo === 'carpete') {
      ctx.fillStyle = '#47505e';
      ctx.fillRect(x, y, w, h);
      for (let ty = y; ty < y + h; ty += 4) {
        ctx.fillStyle = 'rgba(255,255,255,.018)';
        ctx.fillRect(x, ty, w, 2);
      }
    } else if (estilo === 'xadrez') {
      const t = 32;
      for (let ty = y; ty < y + h; ty += t) {
        for (let tx = x; tx < x + w; tx += t) {
          ctx.fillStyle = ((tx / t + ty / t) % 2) ? '#3d4756' : '#4a5566';
          ctx.fillRect(tx, ty, t, t);
        }
      }
    }

    // sombra interior nas bordas (dá profundidade)
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.restore();
  }

  function paredes(ctx, largura, altura) {
    const ESP = 26;
    const ALTO = 92;

    const face = '#2b3440', faceLuz = '#35404e', faceEsc = '#232b35';
    const capa = '#43505f', rodape = '#1d242c';

    const sombraChao = (x0, y0, w0, h0, vertical) => {
      const g = vertical
        ? ctx.createLinearGradient(x0, 0, x0 + w0, 0)
        : ctx.createLinearGradient(0, y0, 0, y0 + h0);
      g.addColorStop(0, 'rgba(0,0,0,.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, w0, h0);
    };

    // ---- parede de cima (face + topo + rodapé)
    ctx.fillStyle = face;
    ctx.fillRect(0, 0, largura, ALTO);
    ctx.fillStyle = faceLuz;
    for (let x = 0; x < largura; x += 120) ctx.fillRect(x, 6, 2, ALTO - 18);
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    for (let x = 60; x < largura; x += 120) ctx.fillRect(x, 6, 1, ALTO - 18);
    ctx.fillStyle = capa;
    ctx.fillRect(0, 0, largura, 6);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(0, 0, largura, 2);
    ctx.fillStyle = rodape;
    ctx.fillRect(0, ALTO - 10, largura, 10);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(0, ALTO - 10, largura, 2);
    sombraChao(0, ALTO, largura, 22, false);

    // ---- paredes laterais
    ctx.fillStyle = faceEsc;
    ctx.fillRect(0, 0, ESP, altura);
    ctx.fillRect(largura - ESP, 0, ESP, altura);
    ctx.fillStyle = capa;
    ctx.fillRect(0, 0, 6, altura);
    ctx.fillRect(largura - 6, 0, 6, altura);
    sombraChao(ESP, 0, 20, altura, true);
    sombraChao(largura - ESP - 20, 0, 20, altura, true);

    // ---- janelas na parede de cima
    const janelas = [[300, 200], [700, 200], [1100, 200]];
    for (const [jx, jw] of janelas) {
      ctx.fillStyle = '#141a21';
      ctx.fillRect(jx - 6, 14, jw + 12, 52);
      const g = ctx.createLinearGradient(0, 18, 0, 62);
      g.addColorStop(0, 'rgba(168,214,240,.92)');
      g.addColorStop(0.55, 'rgba(108,164,203,.85)');
      g.addColorStop(1, 'rgba(70,110,145,.85)');
      ctx.fillStyle = g;
      ctx.fillRect(jx, 18, jw, 44);
      ctx.fillStyle = 'rgba(255,255,255,.30)';
      ctx.fillRect(jx + 24, 28, 46, 8);
      ctx.fillRect(jx + 40, 24, 30, 5);
      ctx.fillRect(jx + jw - 90, 38, 40, 7);
      ctx.fillStyle = '#141a21';
      ctx.fillRect(jx + jw / 2 - 2, 18, 4, 44);
      ctx.fillRect(jx, 38, jw, 3);
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(jx + 6, 20, 16, 40);
      ctx.fillStyle = '#3c4959';
      ctx.fillRect(jx - 8, 64, jw + 16, 6);
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fillRect(jx - 8, 64, jw + 16, 2);
    }

    // ---- quadro branco com post-its
    ctx.fillStyle = '#e8ecef';
    ctx.fillRect(548, 18, 118, 50);
    ctx.strokeStyle = '#2b3440';
    ctx.lineWidth = 3;
    ctx.strokeRect(548, 18, 118, 50);
    const notas = ['#f2c14e', '#e07a5f', '#81b29a', '#7aa8d0', '#f2c14e'];
    notas.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(556 + i * 22, 26 + (i % 2) * 12, 16, 14);
    });
    ctx.fillStyle = 'rgba(40,50,62,.55)';
    ctx.fillRect(556, 56, 70, 2);
    ctx.fillRect(556, 61, 46, 2);

    // ---- quadro com gravura
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(962, 22, 62, 44);
    ctx.fillStyle = '#2f4a63';
    ctx.fillRect(966, 26, 54, 36);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(972, 34, 42, 3);
    ctx.fillRect(976, 42, 34, 2);

    // ---- relógio de parede
    ctx.fillStyle = '#1d242c';
    ctx.beginPath(); ctx.arc(1352, 40, 19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8ecef';
    ctx.beginPath(); ctx.arc(1352, 40, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b3440';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1352, 40); ctx.lineTo(1352, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1352, 40); ctx.lineTo(1360, 44); ctx.stroke();

    // ---- painel de avisos
    ctx.fillStyle = '#4a3521';
    ctx.fillRect(1410, 20, 130, 50);
    ctx.fillStyle = '#8a7350';
    ctx.fillRect(1414, 24, 122, 42);
    ['#f2c14e', '#e07a5f', '#e8ecef'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(1422 + i * 38, 30, 30, 30);
    });
  }

  // ---- paredes interiores (entram na colisão)
  function paredesInteriores(ctx) {
    for (const w of MAPA.paredes) {
      const { x, y, w: ww, h: hh } = w;

      if (w.vidro) {
        // vidro: moldura escura + pano translúcido
        ctx.fillStyle = '#1b2530';
        ctx.fillRect(x, y, ww, hh);
        const g = ctx.createLinearGradient(x, y, x + ww, y + hh);
        g.addColorStop(0, 'rgba(150,205,230,.45)');
        g.addColorStop(1, 'rgba(90,140,175,.35)');
        ctx.fillStyle = g;
        ctx.fillRect(x + 2, y + 2, ww - 4, hh - 4);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        if (ww > hh) ctx.fillRect(x + 4, y + 3, ww - 8, 1.5);
        else ctx.fillRect(x + 3, y + 4, 1.5, hh - 8);
      } else {
        // alvenaria vista de cima: bloco mais grosso que a colisão (lê-se melhor)
        const gx = x - 4, gy = y - 3, gw = ww + 8, gh = hh + 6;
        ctx.fillStyle = 'rgba(0,0,0,.34)';
        ctx.fillRect(gx + 4, gy + 5, gw, gh);
        ctx.fillStyle = '#414d5c';
        ctx.fillRect(gx, gy, gw, gh);
        // capa iluminada
        ctx.fillStyle = '#5b6a7c';
        ctx.fillRect(gx, gy, gw, Math.max(5, gh * 0.42));
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(gx, gy, gw, 2);
        // sombra na base
        ctx.fillStyle = 'rgba(0,0,0,.26)';
        ctx.fillRect(gx, gy + gh - 3, gw, 3);
      }
    }
  }

  // ---- luz: feixes das janelas e sombras das paredes no chão
  function luz(ctx) {
    // feixes de luz que entram pelas janelas
    for (const [jx, jw] of [[300, 200], [700, 200], [1100, 200]]) {
      const g = ctx.createLinearGradient(0, 92, 0, 330);
      g.addColorStop(0, 'rgba(255,244,214,.20)');
      g.addColorStop(0.55, 'rgba(255,240,205,.10)');
      g.addColorStop(1, 'rgba(255,240,205,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(jx, 92);
      ctx.lineTo(jx + jw, 92);
      ctx.lineTo(jx + jw + 56, 330);
      ctx.lineTo(jx - 56, 330);
      ctx.closePath();
      ctx.fill();
    }

    // sombra projetada pelas paredes interiores
    for (const w of MAPA.paredes) {
      if (w.vidro) continue;
      if (w.w > w.h) {
        // parede horizontal: sombra para baixo
        const g = ctx.createLinearGradient(0, w.y + w.h, 0, w.y + w.h + 26);
        g.addColorStop(0, 'rgba(0,0,0,.34)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(w.x - 2, w.y + w.h, w.w + 6, 26);
      } else {
        const g = ctx.createLinearGradient(w.x + w.w, 0, w.x + w.w + 22, 0);
        g.addColorStop(0, 'rgba(0,0,0,.30)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(w.x + w.w, w.y - 2, 22, w.h + 6);
      }
    }

    // sombra suave debaixo da parede de cima
    const g2 = ctx.createLinearGradient(0, 92, 0, 150);
    g2.addColorStop(0, 'rgba(0,0,0,.26)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 92, LARG, 58);
  }

  // ---- rótulos das zonas
  function rotulos(ctx) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const z of MAPA.salas) {
      const nome = z.nome;
      ctx.font = '600 8px "Segoe UI",sans-serif';
      const larg = ctx.measureText(nome).width + 18;
      ctx.fillStyle = 'rgba(14,19,26,.72)';
      ctx.beginPath();
      ctx.roundRect(z.x + 10, z.y + 8, larg, 15, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(226,232,240,.85)';
      ctx.fillRect(z.x + 16, z.y + 15, 3, 3);
      ctx.fillStyle = '#c9d4e0';
      ctx.fillText(nome, z.x + 24, z.y + 16);
    }
  }

  // ---------------------------------------------------------------- mesa
  // cada pessoa escolhe o tampo, o computador, a cadeira e as decorações
  const TAMPOS = {
    carvalho: { tampo: '#7a5c36', luz: '#9d7c4c', esc: '#4b3720', veio: 'rgba(0,0,0,.12)' },
    nogueira: { tampo: '#5b3a25', luz: '#7d5437', esc: '#33200f', veio: 'rgba(0,0,0,.16)' },
    branco:   { tampo: '#d5d1c6', luz: '#efece4', esc: '#9b968b', veio: 'rgba(0,0,0,.05)' },
    preto:    { tampo: '#34383f', luz: '#4a5058', esc: '#1b1e23', veio: 'rgba(255,255,255,.05)' },
    vidro:    { tampo: '#6f9aa8', luz: '#b6d6de', esc: '#42636f', veio: 'rgba(255,255,255,.10)' },
  };

  // ---------------------------------------------------- cores de tampo
  // Os tons são gerados a partir do sprite de madeira, por isso as sombras
  // e os realces continuam iguais aos do WorkAdventure.
  const TINTA_MESA = {
    branco: ['#9e978a', '#c9c4b8', '#e4e0d7', '#f7f5f0'],
    preto:  ['#1c1f24', '#2c3037', '#3b4048', '#4c525c'],
    vidro:  ['#3e5b66', '#6b94a1', '#8db4c0', '#bcd8df'],
  };
  const TABELAS = {
    carvalho: 'Table_TableBrown',
    nogueira: 'Table_TableDarkBrown',
    branco: 'Table_TableBrown@branco',
    preto: 'Table_TableBrown@preto',
    vidro: 'Table_TableBrown@vidro',
  };

  function criarTinta(origem, rampa, chave) {
    const img = IMGS.get(origem);
    if (!img || !img.width) return;
    const c = canvasTinta;
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    let dados;
    try { dados = g.getImageData(0, 0, c.width, c.height); } catch (e) { return; }
    const d = dados.data;
    const cores = rampa.map((h) => parseInt(h.slice(1), 16));
    for (let k = 0; k < d.length; k += 4) {
      if (d[k + 3] < 8) continue;
      const lum = (d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114) / 255;
      const idx = Math.min(3, Math.max(0, Math.floor((1 - lum) * 4)));
      const n = cores[idx];
      d[k] = (n >> 16) & 255; d[k + 1] = (n >> 8) & 255; d[k + 2] = n & 255;
    }
    g.putImageData(dados, 0, 0);
    const saida = document.createElement('canvas');
    saida.width = c.width; saida.height = c.height;
    saida.getContext('2d').drawImage(c, 0, 0);
    IMGS.set(chave, saida);
  }

  const canvasTinta = document.createElement('canvas');
  let tintasProntas = false;
  function prepararTintas() {
    if (tintasProntas) return;
    tintasProntas = true;
    for (const [nome, rampa] of Object.entries(TINTA_MESA)) {
      criarTinta('Table_TableBrown', rampa, 'Table_TableBrown@' + nome);
    }
  }

  // balcão: tampo com bisel, frente com painéis e rodapé
  function balcao(ctx, x, y, w, h) {
    const alturaTampo = 14;
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.fillRect(x + 4, y + h, w, 8);
    // frente
    ctx.fillStyle = '#4a3521';
    ctx.fillRect(x, y + alturaTampo, w, h - alturaTampo);
    ctx.fillStyle = 'rgba(0,0,0,.20)';
    ctx.fillRect(x + w - 6, y + alturaTampo, 6, h - alturaTampo);
    // painéis rebaixados
    const n = Math.max(2, Math.round(w / 70));
    const larg = (w - 16) / n;
    for (let i = 0; i < n; i++) {
      const px = x + 8 + i * larg;
      ctx.fillStyle = '#55402a';
      ctx.fillRect(px, y + alturaTampo + 8, larg - 8, h - alturaTampo - 18);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(px, y + alturaTampo + 8, larg - 8, 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(px, y + h - 12, larg - 8, 2);
    }
    // rodapé recuado
    ctx.fillStyle = '#2f2416';
    ctx.fillRect(x + 4, y + h - 6, w - 8, 6);
    // tampo
    ctx.fillStyle = '#6d5132';
    ctx.fillRect(x - 4, y, w + 8, alturaTampo);
    ctx.fillStyle = '#8f6d45';
    ctx.fillRect(x - 4, y, w + 8, 3);
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.fillRect(x - 4, y, w + 8, 1);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.fillRect(x - 4, y + alturaTampo - 3, w + 8, 3);
  }

  // ---------------------------------------------------- tampo de mesa reutilizável
  // desenha um tampo fino com pernas e painel, pronto a receber objetos em cima
  function tampoMesa(ctx, x, y, w, h, sprite) {
    const topoY = y + 14;
    const alturaTampo = 44;
    const pernasY = topoY + alturaTampo;

    // pernas
    ctx.fillStyle = '#4a3521';
    ctx.fillRect(x + 5, pernasY - 4, 5, h - (pernasY - y) + 2);
    ctx.fillRect(x + w - 10, pernasY - 4, 5, h - (pernasY - y) + 2);
    // painel de modéstia
    ctx.fillStyle = '#563d26';
    ctx.fillRect(x + 10, pernasY - 2, w - 20, h - (pernasY - y) - 6);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(x + 10, pernasY - 2, w - 20, 2);
    ctx.fillStyle = 'rgba(0,0,0,.26)';
    ctx.fillRect(x, pernasY, w, 3);

    // superfície
    if (IMGS.get(sprite)) {
      objetoParcial(ctx, sprite, 0, 20, 64, 58, x, topoY, w, alturaTampo);
    } else {
      ctx.fillStyle = '#8a6a48';
      ctx.fillRect(x, topoY, w, alturaTampo);
    }

    // bisel: aresta de cima iluminada, frente em sombra, lados escurecidos
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x, topoY, w, 2);
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.fillRect(x, topoY + alturaTampo - 5, w, 5);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(x, topoY, 2, alturaTampo);
    ctx.fillRect(x + w - 2, topoY, 2, alturaTampo);
    // veio de madeira: duas linhas discretas
    ctx.fillStyle = 'rgba(90,62,38,.18)';
    ctx.fillRect(x + 4, topoY + 12, w - 8, 1);
    ctx.fillRect(x + 4, topoY + 26, w - 16, 1);
  }

  // ---------------------------------------------------- mesa de trabalho
  const DECORACOES = {
    nada: null,
    planta: 'Office_Plant_PlantSmall',
    caneca: 'Office_Props_Mugs',
    candeeiro: 'Office_Props_Clock',
    lapis: 'Office_Props_Book1',
    moldura: 'Office_Props_Mirror',
    telefone: 'Office_Props_Folders',
    livros: 'Office_Props_Book1',
  };

  function mesa(ctx, d, estado = {}) {
    const { x, y, w, h } = d;
    const est = d.estilo || {};
    const minha = !!estado.minha;
    const trancada = !!estado.trancada;
    const ocupada = !!estado.ocupada;
    const cx = Math.round(x + w / 2);

    prepararTintas();

    // sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(cx, y + h - 4, w * 0.58, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    tampoMesa(ctx, x, y, w, h, TABELAS[est.mesa] || TABELAS.carvalho);

    // tudo o que está em cima assenta a esta altura
    const tampo = y + 46;   // superfície do tampo (o monitor fica do lado de quem senta)

    // computador
    const pc = est.pc || 'monitor';
    if (pc === 'dual') {
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx - 17, tampo, 32);
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx + 17, tampo, 32);
    } else if (pc === 'portatil') {
      objeto(ctx, 'Computer_LaptopBlackDown', cx, tampo, 34);
    } else if (pc === 'torre') {
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx - 8, tampo, 32);
      objeto(ctx, 'Office_Props_Folders', cx + 22, tampo - 6, 14);
    } else {
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx, tampo, 34);
    }

    // decorações dos cantos
    const decor = (nome, px) => {
      const spr = DECORACOES[nome];
      if (spr) objeto(ctx, spr, px, tampo + 6, 26);
    };
    decor(est.decor, x + 11);
    decor(est.decor2, x + w - 11);

    // placa do nome, à frente do tampo (não cruza com quem está sentado)
    if (d.owner || d.label) {
      const nome = String(d.owner || d.label).slice(0, 16);
      ctx.font = '700 7px "Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const larg = Math.min(w + 6, ctx.measureText(nome).width + 10);
      // suporte da placa
      ctx.fillStyle = '#2b3138';
      ctx.fillRect(cx - larg / 2 + 3, y + 70, larg - 6, 3);
      ctx.fillStyle = 'rgba(12,15,20,.78)';
      ctx.beginPath();
      ctx.roundRect(cx - larg / 2, y + 59, larg, 12, 3);
      ctx.fill();
      ctx.strokeStyle = d.owner ? 'rgba(229,194,92,.55)' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = d.owner ? '#f2d98a' : '#a8b4c0';
      ctx.fillText(nome, cx, y + 65.5);
    }

    if (trancada) {
      ctx.font = '7px "Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', x + w - 4, y + 66);
    }

  }


  // cadeira do lado de quem se senta (atrás da mesa): desenhada antes do
  // boneco, para o encosto aparecer por trás dele
  function cadeiraDaMesa(ctx, d) {
    const est = d.estilo || {};
    const cx = Math.round(d.x + d.w / 2);
    const base = d.y + 24;
    const cores = {
      escritorio: ['#3a49bd', '#2b3792', '#5563d6'],
      gamer:      ['#c0392b', '#8e2a20', '#e05a4a'],
      madeira:    ['#5a8c5a', '#3f6b3f', '#7aae7a'],
      banco:      ['#8a939d', '#666f78', '#a8b2bc'],
    }[est.cadeira] || ['#3a49bd', '#2b3792', '#5563d6'];

    const l = 26, altEncosto = 20;
    const x = cx - l / 2;
    const yEncosto = base - 34;

    // poste e base (por baixo do encosto)
    ctx.fillStyle = '#2b3138';
    ctx.fillRect(cx - 2, yEncosto + altEncosto, 4, 10);
    ctx.fillRect(cx - 9, yEncosto + altEncosto + 10, 18, 3);
    ctx.fillStyle = '#1d2227';
    ctx.fillRect(cx - 10, yEncosto + altEncosto + 12, 4, 3);
    ctx.fillRect(cx + 6, yEncosto + altEncosto + 12, 4, 3);

    // encosto com cantos arredondados
    ctx.fillStyle = cores[1];
    ctx.beginPath();
    ctx.roundRect(x, yEncosto, l, altEncosto, 5);
    ctx.fill();
    ctx.fillStyle = cores[0];
    ctx.beginPath();
    ctx.roundRect(x + 1.5, yEncosto + 1.5, l - 3, altEncosto - 5, 4);
    ctx.fill();
    // realce superior
    ctx.fillStyle = cores[2];
    ctx.beginPath();
    ctx.roundRect(x + 3, yEncosto + 3, l - 6, 3, 1.5);
    ctx.fill();
    // soleira do encosto
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x + 2, yEncosto + altEncosto - 4, l - 4, 2);
  }

  // ---------------------------------------------------- computador (de costas)
  function computador(ctx, mx, y, tipo, ocupada, B = 2) {
    const caixa = '#39414d', aresta = '#4b5462', fundo = '#262c35', vent = '#5b6572';

    const teclado = (desloca = 0) => {
      ctx.fillStyle = '#20252c';
      ctx.fillRect(mx - 9 * B + desloca, y + 4 * B, 18 * B, 5 * B);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (let kx = mx - 8 * B + desloca; kx < mx + 8 * B + desloca; kx += 3 * B) ctx.fillRect(kx, y + 5 * B, 2 * B, 3 * B);
      ctx.fillStyle = '#20252c';
      ctx.fillRect(mx + 11 * B + desloca, y + 5 * B, 3 * B, 5 * B);
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fillRect(mx + 11 * B + desloca, y + 5 * B, 3 * B, B);
    };

    const luzEcra = () => {
      if (!ocupada) return;
      ctx.fillStyle = 'rgba(120,210,220,.10)';
      ctx.fillRect(mx - 12 * B, y + 3 * B, 24 * B, 5 * B);
      ctx.fillStyle = 'rgba(120,210,220,.06)';
      ctx.fillRect(mx - 14 * B, y + 2 * B, 28 * B, 8 * B);
    };

    if (tipo === 'portatil') {
      teclado(-2 * B);
      if (objeto(ctx, 'Office_Computer_LaptopBlackDown', mx, y + 46, 44)) return;
      // base do portátil
      ctx.fillStyle = '#262c35';
      ctx.fillRect(mx - 12 * B, y + 9 * B, 24 * B, 3 * B);
      ctx.fillStyle = '#39414c';
      ctx.fillRect(mx - 12 * B, y + 9 * B, 24 * B, B);
      // tampa vista de trás, inclinada
      ctx.fillStyle = '#20252c';
      ctx.fillRect(mx - 10 * B, y + 11 * B, 20 * B, 8 * B);
      ctx.fillStyle = '#2b313a';
      ctx.fillRect(mx - 9 * B, y + 12 * B, 18 * B, 6 * B);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(mx - 3 * B, y + 15 * B, 6 * B, B);     // autocolante
      luzEcra();
      return;
    }

    if (tipo === 'dual') {
      teclado(0);
      if (objeto(ctx, 'Office_Computer_ScreenBlackUp', mx - 16, y + 46, 40) &&
          objeto(ctx, 'Office_Computer_ScreenBlackUp', mx + 20, y + 46, 40)) {
        if (ocupada) {
          ctx.fillStyle = 'rgba(120,210,220,.10)';
          ctx.fillRect(mx - 34, y + 26, 68, 8);
        }
        return;
      }
      ctx.fillStyle = '#1d222a';
      ctx.fillRect(mx - 9 * B, y + 19 * B, 22 * B, 3 * B);   // base comum

      // monitor principal (de costas)
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(mx - 15 * B, y + 10 * B, 17 * B, 10 * B);
      ctx.fillStyle = caixa;
      ctx.fillRect(mx - 15 * B, y + 9 * B, 17 * B, 10 * B);
      ctx.fillStyle = aresta;
      ctx.fillRect(mx - 15 * B, y + 9 * B, 17 * B, B);
      ctx.fillStyle = vent;
      for (let i2 = 0; i2 < 2; i2++) ctx.fillRect(mx - 13 * B, y + 12 * B + i2 * 2 * B, 13 * B, B);

      // segundo monitor, mais pequeno e encostado à direita
      ctx.fillStyle = 'rgba(0,0,0,.30)';
      ctx.fillRect(mx + 3 * B, y + 12 * B, 12 * B, 8 * B);
      ctx.fillStyle = caixa;
      ctx.fillRect(mx + 3 * B, y + 11 * B, 12 * B, 8 * B);
      ctx.fillStyle = aresta;
      ctx.fillRect(mx + 3 * B, y + 11 * B, 12 * B, B);
      ctx.fillStyle = vent;
      ctx.fillRect(mx + 5 * B, y + 14 * B, 8 * B, B);

      luzEcra();
      return;
    }

    if (tipo === 'torre') {
      teclado(-2 * B);
      // torre ao lado direito
      ctx.fillStyle = '#1b2027';
      ctx.fillRect(mx + 15 * B, y + 7 * B, 7 * B, 13 * B);
      ctx.fillStyle = '#262c35';
      ctx.fillRect(mx + 15 * B, y + 7 * B, 6 * B, 12 * B);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(mx + 16 * B, y + 9 * B, 4 * B, B);
      ctx.fillStyle = '#5fd08a';
      ctx.fillRect(mx + 16 * B, y + 12 * B, B, B);        // led
      ctx.fillStyle = '#2b313a';
      ctx.fillRect(mx + 16 * B, y + 15 * B, 4 * B, B);     // baía
    }

    // monitor simples (de costas)
    if (tipo !== 'torre') teclado(0);

    // sprite do monitor (mais bonito que o desenhado à mão)
    if (tipo !== 'dual' && objeto(ctx, 'Office_Computer_ScreenBlackUp', mx, y + 46, 46)) {
      if (ocupada) {
        ctx.fillStyle = 'rgba(120,210,220,.12)';
        ctx.fillRect(mx - 20, y + 26, 40, 8);
      }
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(mx - 13 * B, y + 10 * B, 26 * B, 11 * B);
    ctx.fillStyle = caixa;
    ctx.fillRect(mx - 13 * B, y + 9 * B, 26 * B, 10 * B);
    ctx.fillStyle = aresta;
    ctx.fillRect(mx - 13 * B, y + 9 * B, 26 * B, B);
    ctx.fillStyle = fundo;
    ctx.fillRect(mx - 13 * B, y + 18 * B, 26 * B, B);
    ctx.fillStyle = vent;
    for (let i = 0; i < 3; i++) ctx.fillRect(mx - 8 * B, y + 11 * B + i * 2 * B, 16 * B, B);
    ctx.fillStyle = 'rgba(230,235,242,.45)';
    ctx.fillRect(mx - B, y + 16 * B, 3 * B, B);
    ctx.fillStyle = '#1d222a';
    ctx.fillRect(mx - 2 * B, y + 19 * B, 4 * B, 3 * B);
    ctx.fillStyle = '#262c35';
    ctx.fillRect(mx - 7 * B, y + 21 * B, 14 * B, 2 * B);
    ctx.fillStyle = '#12161b';
    ctx.fillRect(mx + 13 * B, y + 14 * B, B, 6 * B);
    luzEcra();
  }

  // ---------------------------------------------------- decorações de mesa
  function decoracao(ctx, x, y, tipo, B = 2) {
    if (!tipo || tipo === 'nenhuma') return;

    const p = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h); };

    if (tipo === 'planta') {
      p(-4, 2, 8, 5, '#7a4c2c');
      p(-4, 2, 8, 1, '#9a6238');
      p(-5, -6, 10, 7, '#2f6b45');
      p(-2, -9, 4, 3, '#3f8a58');
      p(2, -4, 3, 2, '#3f8a58');
      return;
    }

    if (tipo === 'caneca') {
      p(-4, 3, 9, 1, 'rgba(0,0,0,.35)');   // sombra na mesa
      p(-3, -2, 7, 6, '#4a4136');          // contorno
      p(-2, -1, 5, 4, '#efece4');
      p(-2, -1, 5, 1, '#ffffff');
      p(3, 0, 2, 3, '#4a4136');            // asa
      p(4, 1, 1, 1, '#efece4');
      p(-1, -2, 3, 1, '#6b4433');          // café
      return;
    }

    if (tipo === 'candeeiro') {
      p(3, -2, 2, 8, '#3a3f48');
      p(-2, -6, 12, 4, '#c9a227');
      p(-1, -5, 10, 2, '#f0d98a');
      p(-4, 5, 14, 2, '#2c3138');
      return;
    }

    if (tipo === 'lapis') {
      p(-5, 4, 10, 1, 'rgba(0,0,0,.30)');
      p(-5, -1, 10, 6, '#24303d');
      p(-4, 0, 8, 4, '#3f6fa8');
      p(-4, 0, 8, 1, '#6d9cd4');
      p(-3, -8, 2, 8, '#e8b87a');    // lápis
      p(-3, -9, 2, 2, '#f0d0a0');
      p(0, -7, 2, 7, '#c94f4f');
      p(3, -6, 2, 6, '#5fae7a');
      return;
    }

    if (tipo === 'moldura') {
      p(-6, -8, 12, 10, '#9a7a4a');
      p(-5, -7, 10, 8, '#2b3a4a');
      p(-5, -7, 10, 3, '#3f6fa8');
      p(-2, -3, 4, 3, '#d9c9a3');
      return;
    }

    if (tipo === 'telefone') {
      p(-4, -2, 8, 6, '#20252c');
      p(-3, -3, 6, 2, '#2f363f');
      p(-3, 3, 6, 1, '#5fd08a');
      return;
    }

    if (tipo === 'livros') {
      p(-5, 0, 4, 6, '#a3526c');
      p(-1, -1, 4, 7, '#3f6fa8');
      p(3, 1, 4, 5, '#2f7a55');
      return;
    }
  }

  // ---------------------------------------------------- sprites de móveis
  // objetos do pack do WorkAdventure (Pipoya), 1 píxel = 1 unidade de mundo
  const IMGS = new Map();
  const LISTA_OBJETOS = [
    'Furniture_Shelf_ShelfBig', 'Shelf_ShelfBig', 'Shelf_Shelf', 'Furniture_Couch_CouchBrownDown',
    'Office_Props_CoffeeDispenser', 'Office_Plant_PlantLarge', 'Office_Plant_Plant',
    'Office_Plant_PlantSmall', 'Office_Props_Bin', 'Office_Props_Mugs',
    'Office_Props_Folders', 'Office_Computer_Printer',
    'Office_Computer_ScreenBlackUp', 'Office_Computer_ScreenWhiteUp', 'Office_Computer_LaptopBlackDown',
    'Office_Computer_BigScreenBlackUp', 'Office_Props_Book1', 'Office_Props_Basket', 'Computer_LaptopBlackDown',
    'Chair_ChairBlueUp', 'Chair_ChairRedUp', 'Chair_ChairGreenUp', 'Chair_ChairGreyUp',
    'Furniture_Armchair_ArmchairBlueDown', 'Furniture_Armchair_ArmchairGreyDown',
    'Furniture_PoufBrown', 'Furniture_PoufOrange',
    'Table_TableBrown', 'Table_TableDarkBrown', 'Table_TableSmallWhite', 'Table_TableSmallGrey', 'Table_TableNarrowBrown',
  ];

  function carregarObjetos(lista) {
    const nomes = lista || LISTA_OBJETOS;
    const tudo = Promise.all(nomes.map((n) => new Promise((ok) => {
      if (IMGS.has(n)) return ok();
      const img = new Image();
      img.onload = () => { IMGS.set(n, img); ok(); };
      img.onerror = () => ok();
      img.src = 'objetos/' + n + '.png';
    })));
    return tudo.then(() => { tintasProntas = false; prepararTintas(); });
  }

  // desenha um objeto com a base em (x, y) e a largura pedida
  function objeto(ctx, nome, x, y, largura) {
    const img = IMGS.get(nome);
    if (!img) return false;
    const e = largura / img.width;
    const alt = img.height * e;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(x - largura / 2), Math.round(y - alt), Math.round(largura), Math.round(alt));
    ctx.restore();
    return true;
  }

  // desenha apenas um recorte do sprite (para separar tampo de pernas)
  function objetoParcial(ctx, nome, sx, sy, sw, sh, dx, dy, dw, dh) {
    const img = IMGS.get(nome);
    if (!img) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    ctx.restore();
    return true;
  }

  // ---------------------------------------------------- objetos do escritório
  function objetos(ctx) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    // ============================================================ GABINETE (privado)
    p(238, 246, 196, 74, '#3b3327');
    p(241, 249, 190, 68, '#4a4034');
    objeto(ctx, 'Shelf_ShelfBig', 232, 254, 56);
    tampoMesa(ctx, 340, 204, 64, 96, 'Table_TableDarkBrown');
    objeto(ctx, 'Office_Computer_ScreenBlackUp', 356, 250, 30);
    objeto(ctx, 'Office_Computer_ScreenBlackUp', 388, 250, 30);
    objeto(ctx, 'Office_Props_Folders', 372, 246, 16);
    ctx.save();
    ctx.translate(372, 232);
    ctx.fillStyle = '#2b3792';
    ctx.beginPath(); ctx.roundRect(-13, -20, 26, 20, 5); ctx.fill();
    ctx.fillStyle = '#3a49bd';
    ctx.beginPath(); ctx.roundRect(-11.5, -18.5, 23, 15, 4); ctx.fill();
    ctx.fillStyle = '#5563d6';
    ctx.beginPath(); ctx.roundRect(-9, -15, 18, 3, 1.5); ctx.fill();
    ctx.fillStyle = '#2b3138';
    ctx.fillRect(-2, 0, 4, 8);
    ctx.restore();
    objeto(ctx, 'Furniture_Couch_CouchBrownDown', 424, 300, 66);
    objeto(ctx, 'Office_Plant_Plant', 250, 322, 50);
    objeto(ctx, 'Office_Props_Bin', 300, 322, 16);

    // ============================================================ COPA (520..1020 × 92..300)
    // geleira
    p(520, 212, 58, 8, 'rgba(0,0,0,.30)');
    p(524, 124, 50, 88, '#8f9aa6');
    p(524, 124, 50, 3, '#aab4be');
    p(524, 124, 3, 88, '#7c8794');
    p(526, 127, 46, 40, '#c6ced7');
    p(526, 170, 46, 38, '#bcc6cf');
    p(526, 166, 46, 3, '#6f7b87');
    p(526, 127, 46, 2, 'rgba(255,255,255,.45)');
    p(526, 170, 46, 2, 'rgba(255,255,255,.30)');
    p(564, 138, 3, 16, '#5f6a76');
    p(564, 180, 3, 16, '#5f6a76');
    p(526, 190, 46, 3, 'rgba(0,0,0,.18)');

    // backsplash
    p(572, 104, 336, 46, '#39424e');
    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 4; j++) {
        p(574 + i * 12, 106 + j * 11, 10, 9, (i + j) % 2 ? '#48535f' : '#424c58');
      }
    }

    // bancada
    p(568, 206, 344, 12, 'rgba(0,0,0,.30)');
    p(572, 164, 336, 44, '#4a3521');
    p(572, 164, 336, 2, 'rgba(255,255,255,.06)');
    p(578, 200, 324, 8, '#2f2416');
    for (let i = 0; i < 4; i++) {
      const dx = 578 + i * 82;
      p(dx, 168, 76, 30, '#55402a');
      p(dx, 168, 76, 2, 'rgba(255,255,255,.10)');
      p(dx, 194, 76, 2, 'rgba(0,0,0,.30)');
      p(dx + 60, 176, 11, 3, '#9a8358');
    }
    p(568, 148, 344, 18, '#6d5132');
    p(568, 148, 344, 3, '#8f6d45');
    p(568, 148, 344, 1, 'rgba(255,255,255,.35)');
    p(568, 163, 344, 3, 'rgba(0,0,0,.32)');

    // lava-loiça e forno
    p(596, 151, 54, 12, '#8a939d');
    p(599, 153, 48, 8, '#4d555e');
    p(603, 155, 40, 4, '#333a42');
    p(662, 146, 4, 9, '#b9c2cb');
    p(654, 144, 12, 4, '#b9c2cb');
    p(700, 166, 58, 32, '#3a3f46');
    p(703, 169, 52, 18, '#20262d');
    p(706, 171, 46, 13, 'rgba(255,170,90,.40)');
    p(703, 189, 52, 3, '#7d858f');
    p(722, 166, 4, 6, '#a8b0ba');

    // micro-ondas
    p(786, 128, 58, 26, '#2f353c');
    p(790, 132, 36, 18, '#1a1f25');
    p(792, 134, 32, 14, 'rgba(255,215,150,.32)');
    for (let i = 0; i < 3; i++) p(832, 134 + i * 6, 8, 3, '#6d7680');
    p(790, 130, 34, 2, 'rgba(255,255,255,.22)');

    // objetos sobre o tampo
    objeto(ctx, 'Office_Props_CoffeeDispenser', 858, 150, 32);
    objeto(ctx, 'Office_Props_Mugs', 900, 150, 24);
    objeto(ctx, 'Office_Props_Basket', 922, 150, 20);

    // ilha central com dois bancos
    objeto(ctx, 'Table_TableSmallWhite', 700, 268, 44);
    objeto(ctx, 'Chair_ChairGreyUp', 668, 276, 26);
    objeto(ctx, 'Chair_ChairGreyUp', 732, 276, 26);
    objeto(ctx, 'Office_Props_Mugs', 690, 244, 22);

    // sofá e plantas da copa
    p(866, 240, 116, 36, 'rgba(0,0,0,.18)');
    objeto(ctx, 'Furniture_Couch_CouchBrownDown', 924, 284, 110);
    objeto(ctx, 'Office_Plant_PlantLarge', 550, 288, 62);
    objeto(ctx, 'Office_Plant_PlantSmall', 1000, 210, 30);
    objeto(ctx, 'Office_Props_Clock', 860, 150, 22);

    // ============================================================ RECEPÇÃO (40..360 × 700..960)
    p(76, 812, 190, 130, '#3b3327');
    p(79, 815, 184, 124, '#4a4034');
    balcao(ctx, 62, 742, 176, 62);
    objeto(ctx, 'Office_Computer_ScreenWhiteUp', 150, 754, 26);
    objeto(ctx, 'Office_Props_Basket', 200, 754, 16);
    objeto(ctx, 'Office_Props_Book1', 96, 752, 16);
    ctx.save();
    ctx.translate(150, 734);
    ctx.fillStyle = '#2b3792';
    ctx.beginPath(); ctx.roundRect(-12, -18, 24, 18, 5); ctx.fill();
    ctx.fillStyle = '#3a49bd';
    ctx.beginPath(); ctx.roundRect(-10.5, -16.5, 21, 13, 4); ctx.fill();
    ctx.fillStyle = '#5563d6';
    ctx.beginPath(); ctx.roundRect(-8, -13, 16, 3, 1.5); ctx.fill();
    ctx.restore();
    objeto(ctx, 'Table_TableSmallWhite', 150, 900, 40);
    objeto(ctx, 'Chair_ChairGreyDown', 106, 906, 28);
    objeto(ctx, 'Chair_ChairGreyDown', 194, 906, 28);
    objeto(ctx, 'Office_Props_Mugs', 142, 876, 18);
    objeto(ctx, 'Shelf_ShelfBig', 306, 856, 52);
    objeto(ctx, 'Office_Plant_PlantLarge', 66, 944, 56);
    objeto(ctx, 'Office_Plant_PlantSmall', 330, 736, 26);
    objeto(ctx, 'Office_Props_Bin', 246, 800, 16);

    // ============================================================ LOUNGE (1020..1380 × 700..960)
    p(1074, 744, 116, 34, 'rgba(0,0,0,.20)');
    objeto(ctx, 'Furniture_Couch_CouchBrownDown', 1132, 786, 110);
    objeto(ctx, 'Furniture_Couch_CouchGreyDown', 1290, 786, 110);
    objeto(ctx, 'Table_TableSmallWhite', 1210, 806, 40);
    objeto(ctx, 'Office_Props_Mugs', 1204, 786, 18);
    objeto(ctx, 'Office_Plant_Plant', 1044, 800, 62);
    objeto(ctx, 'Office_Props_Bin', 1046, 730, 18);
    objeto(ctx, 'Office_Props_Mirror', 1360, 744, 26);

    // mesa de ping-pong
    p(1036, 926, 156, 12, 'rgba(0,0,0,.28)');
    for (const lx of [1048, 1114, 1180]) p(lx, 894, 5, 34, '#3a3f46');
    p(1036, 852, 156, 46, '#245b45');
    p(1039, 855, 150, 40, '#2f7a5a');
    p(1039, 855, 150, 2, 'rgba(255,255,255,.35)');
    p(1039, 893, 150, 2, 'rgba(0,0,0,.30)');
    p(1113, 852, 3, 46, '#e8eef4');
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1039, 875); ctx.lineTo(1189, 875); ctx.stroke();
    p(1060, 862, 8, 10, '#c0392b');
    p(1160, 878, 8, 10, '#2c3e50');

    // pebolim
    p(1210, 936, 140, 8, 'rgba(0,0,0,.30)');
    ctx.fillStyle = '#4a3521';
    ctx.fillRect(1214, 862, 132, 66);
    ctx.fillStyle = '#6d5132';
    ctx.fillRect(1214, 858, 132, 10);
    ctx.fillStyle = '#8f6d45';
    ctx.fillRect(1214, 858, 132, 3);
    ctx.fillStyle = '#245b45';
    ctx.fillRect(1220, 868, 120, 52);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(1220, 868, 120, 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(1279, 868, 2, 52);
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.fillRect(1220, 872, 8, 44);
    ctx.fillRect(1332, 872, 8, 44);
    for (let i = 0; i < 4; i++) {
      const ry = 876 + i * 12;
      ctx.fillStyle = '#c3ccd5';
      ctx.fillRect(1204, ry, 152, 3);
      ctx.fillStyle = '#8d97a1';
      ctx.fillRect(1204, ry - 2, 7, 7);
      ctx.fillRect(1349, ry - 2, 7, 7);
      for (let k = 0; k < 3; k++) {
        const jx = 1238 + k * 32 + (i % 2) * 8;
        ctx.fillStyle = i % 2 ? '#d94f3d' : '#3a6fd0';
        ctx.fillRect(jx, ry - 6, 6, 9);
        ctx.fillStyle = 'rgba(0,0,0,.30)';
        ctx.fillRect(jx, ry + 1, 6, 2);
      }
    }
    ctx.fillStyle = '#f6efdc';
    ctx.beginPath(); ctx.arc(1272, 890, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(12,15,20,.75)';
    ctx.fillRect(1254, 846, 52, 11);
    ctx.fillStyle = '#f2d98a';
    ctx.font = '700 7px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0  ·  0', 1280, 852);

    // ============================================================ ZONA TRANQUILA (470..890 × 716..942)
    p(470, 716, 420, 226, 'rgba(0,0,0,.18)');
    p(474, 720, 412, 218, '#3f4a5a');
    for (let i = 0; i < 412; i += 26) p(474 + i, 720, 1, 218, 'rgba(255,255,255,.025)');
    objeto(ctx, 'Furniture_Armchair_ArmchairBlueDown', 620, 908, 54);
    objeto(ctx, 'Furniture_Armchair_ArmchairGreyDown', 700, 908, 54);
    objeto(ctx, 'Furniture_Armchair_ArmchairBlueDown', 660, 772, 52);
    objeto(ctx, 'Table_TableSmallWhite', 660, 880, 42);
    objeto(ctx, 'Office_Props_Mugs', 652, 856, 18);
    objeto(ctx, 'Furniture_PoufOrange', 560, 846, 28);
    objeto(ctx, 'Furniture_PoufBrown', 802, 846, 28);
    objeto(ctx, 'Shelf_Shelf', 520, 760, 52);
    objeto(ctx, 'Shelf_ShelfBig', 830, 776, 52);
    objeto(ctx, 'Office_Plant_PlantLarge', 500, 936, 56);
    objeto(ctx, 'Office_Plant_Plant', 868, 936, 54);
    objeto(ctx, 'Office_Props_Clock', 660, 734, 22);

    // ============================================================ ESTAÇÕES: plantas nos cantos
    objeto(ctx, 'Office_Plant_PlantLarge', 392, 690, 58);
    objeto(ctx, 'Office_Plant_PlantLarge', 922, 690, 58);
    objeto(ctx, 'Office_Plant_PlantSmall', 392, 356, 26);
    objeto(ctx, 'Office_Plant_PlantSmall', 930, 356, 26);
    objeto(ctx, 'Office_Props_Bin', 912, 470, 16);
  }

  // ---------------------------------------------------- sala de reunião  // ---------------------------------------------------- sala de reunião  // ---------------------------------------------------- sala de reunião
  // fica à direita do escritório: caminha-se para a direita para entrar.
  // Aqui o raio de distância não conta — todos se ouvem.
  const SALA = { x: 1080, y: 92, w: 300, h: 338 };

  // assentos espalhados pelo escritório (E senta, E levanta)
  const ASSENTOS = [
    { x: 372, y: 226, dir: 0, nome: 'cadeira do gabinete' },
    { x: 668, y: 270, dir: 0, nome: 'banco da copa' },
    { x: 732, y: 270, dir: 0, nome: 'banco da copa' },
    { x: 924, y: 278, dir: 0, nome: 'sofá da copa' },
    { x: 150, y: 728, dir: 0, nome: 'cadeira da recepção' },
    { x: 106, y: 900, dir: 0, nome: 'espera' },
    { x: 194, y: 900, dir: 0, nome: 'espera' },
    { x: 1157, y: 234, dir: 0, nome: 'reunião' },
    { x: 1157, y: 292, dir: 0, nome: 'reunião' },
    { x: 1157, y: 350, dir: 0, nome: 'reunião' },
    { x: 1303, y: 234, dir: 0, nome: 'reunião' },
    { x: 1303, y: 292, dir: 0, nome: 'reunião' },
    { x: 1303, y: 350, dir: 0, nome: 'reunião' },
    { x: 1230, y: 200, dir: 0, nome: 'reunião' },
    { x: 1230, y: 392, dir: 0, nome: 'reunião' },
    { x: 1132, y: 778, dir: 0, nome: 'sofá' },
    { x: 1290, y: 778, dir: 0, nome: 'sofá' },
    { x: 620, y: 882, dir: 0, nome: 'poltrona' },
    { x: 700, y: 882, dir: 0, nome: 'poltrona' },
    { x: 660, y: 752, dir: 0, nome: 'poltrona' },
  ];

  function salaChao(ctx) {
    // o piso da sala é a zona "xadrez" da planta; aqui só a porta de vidro
  }

  // cadeira vista de lado (salas de reunião): dir -1 = encosto à esquerda
  function cadeiraLado(ctx, cx, base, dir) {
    const l = 22, alt = 26;
    const x = cx - l / 2;
    const y = base - alt;
    // assento
    ctx.fillStyle = '#2b3792';
    ctx.beginPath(); ctx.roundRect(x, y + alt - 15, l, 12, 3); ctx.fill();
    ctx.fillStyle = '#3a49bd';
    ctx.beginPath(); ctx.roundRect(x + 1, y + alt - 14, l - 2, 9, 2); ctx.fill();
    // encosto do lado de fora
    const bx = dir < 0 ? x - 2 : x + l - 3;
    ctx.fillStyle = '#2b3792';
    ctx.beginPath(); ctx.roundRect(bx, y, 5, alt - 6, 2); ctx.fill();
    ctx.fillStyle = '#5563d6';
    ctx.fillRect(bx + 1, y + 1, 2, alt - 9);
    // pernas
    ctx.fillStyle = '#2b3138';
    ctx.fillRect(x + 3, y + alt - 4, 2, 5);
    ctx.fillRect(x + l - 5, y + alt - 4, 2, 5);
  }

  function salaMesa(ctx) {
    const cx = 1230;
    const x = cx - 55;          // tampo de 110 de largura
    const yTampo = 186;
    const altTampo = 178;

    // pernas grossas nos cantos
    ctx.fillStyle = '#4a3521';
    ctx.fillRect(x + 6, yTampo + altTampo - 6, 7, 26);
    ctx.fillRect(x + 97, yTampo + altTampo - 6, 7, 26);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(x, yTampo + altTampo + 16, 110, 8);

    // tampo grande com bisel
    ctx.fillStyle = '#6d5132';
    ctx.fillRect(x, yTampo, 110, altTampo);
    ctx.fillStyle = '#8f6d45';
    ctx.fillRect(x, yTampo, 110, 4);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fillRect(x, yTampo, 110, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.fillRect(x, yTampo + altTampo - 5, 110, 5);
    ctx.fillStyle = 'rgba(90,62,38,.16)';
    for (let i = 1; i < 5; i++) {
      ctx.fillRect(x + 4, yTampo + i * 34, 102, 1);
    }

    // objetos em cima da mesa
    objeto(ctx, 'Office_Props_Folders', cx - 26, yTampo + 40, 20);
    objeto(ctx, 'Office_Props_Mugs', cx + 8, yTampo + 88, 20);
    objeto(ctx, 'Office_Props_Book1', cx - 10, yTampo + 138, 20);
    objeto(ctx, 'Office_Plant_PlantSmall', cx + 30, yTampo + 34, 24);

    // cadeiras ao longo dos dois lados
    for (let i = 0; i < 3; i++) {
      cadeiraLado(ctx, x - 18, 240 + i * 58, -1);
      cadeiraLado(ctx, x + 128, 240 + i * 58, 1);
    }
    // cabeceiras
    objeto(ctx, 'Chair_ChairBlueUp', cx, yTampo + 12, 30);
    objeto(ctx, 'Chair_ChairBlueDown', cx, yTampo + altTampo + 22, 30);

    // ecrã de projeção na parede
    ctx.fillStyle = '#1b2530';
    ctx.fillRect(cx - 54, 104, 108, 40);
    const g = ctx.createLinearGradient(0, 108, 0, 140);
    g.addColorStop(0, 'rgba(150,205,230,.55)');
    g.addColorStop(1, 'rgba(90,140,175,.35)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 51, 107, 102, 34);

    // plantas aos cantos da sala
    objeto(ctx, 'Office_Plant_PlantSmall', SALA.x + 22, 300, 30);
    objeto(ctx, 'Office_Plant_PlantSmall', SALA.x + SALA.w - 20, 300, 30);
  }

  // ---------------------------------------------------- cadeiras  // ---------------------------------------------------- cadeiras
  function cadeira(ctx, cx, y0, tipo = 'escritorio') {
    const B = 2;
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    const paletas = {
      escritorio: { pano: '#3a4553', luz: '#4d5a6a', esc: '#242c36' },
      gamer:      { pano: '#8f2f3a', luz: '#b84450', esc: '#3a1418' },
      madeira:    { pano: '#8a6238', luz: '#a97c4b', esc: '#4f3620' },
      banco:      { pano: '#5a6675', luz: '#6f7d8e', esc: '#333b46' },
    };
    const c = paletas[tipo] || paletas.escritorio;
    const metal = '#5b6674', metalLuz = '#8695a6', metalEsc = '#333a44';

    p(cx - 34, y0 + 60, 68, 5, 'rgba(0,0,0,.30)');   // sombra

    if (tipo === 'banco') {
      // banco alto, sem encosto
      p(cx - 16, y0 + 18, 32, 10, c.esc);
      p(cx - 14, y0 + 19, 28, 7, c.pano);
      p(cx - 14, y0 + 19, 28, 2, c.luz);
      p(cx - 4, y0 + 28, 8, 22, metalEsc);
      p(cx - 3, y0 + 28, 2, 22, metalLuz);
      p(cx - 12, y0 + 26, 24, 3, metal);
      p(cx - 20, y0 + 50, 40, 4, metalEsc);
      p(cx - 26, y0 + 54, 10, 3, metalEsc);
      p(cx + 16, y0 + 54, 10, 3, metalEsc);
      p(cx - 28, y0 + 57, 7, 5, '#1a1f26');
      p(cx + 21, y0 + 57, 7, 5, '#1a1f26');
      p(cx - 6, y0 + 57, 7, 5, '#1a1f26');
      return;
    }

    // encosto
    const alto = tipo === 'gamer' ? 6 : 0;
    p(cx - 30, y0 - alto, 60, 26 + alto, c.esc);
    p(cx - 27, y0 - alto + 2, 54, 21 + alto, c.pano);
    p(cx - 27, y0 - alto + 2, 54, 3, c.luz);
    for (let i = 0; i < 3 + (alto ? 1 : 0); i++) p(cx - 25, y0 - alto + 8 + i * 5, 50, 1, 'rgba(255,255,255,.07)');
    p(cx - 6, y0 - alto + 2, 3, 21 + alto, 'rgba(255,255,255,.05)');

    if (tipo === 'madeira') {
      p(cx - 26, y0 - alto + 4, 3, 19 + alto, c.esc);
      p(cx - 14, y0 - alto + 4, 3, 19 + alto, c.esc);
      p(cx - 2, y0 - alto + 4, 3, 19 + alto, c.esc);
      p(cx + 10, y0 - alto + 4, 3, 19 + alto, c.esc);
      p(cx + 20, y0 - alto + 4, 3, 19 + alto, c.esc);
    }

    if (tipo === 'gamer') {
      p(cx - 22, y0 - alto + 4, 44, 3, c.luz);        // faixa
      p(cx - 4, y0 - alto + 1, 8, 3, c.esc);          // apoio de cabeça
    }

    // braços
    p(cx - 38, y0 + 20, 9, 12, metalEsc);
    p(cx + 29, y0 + 20, 9, 12, metalEsc);
    p(cx - 40, y0 + 18, 12, 4, metal);
    p(cx + 28, y0 + 18, 12, 4, metal);
    p(cx - 40, y0 + 18, 12, 1, metalLuz);
    p(cx + 28, y0 + 18, 12, 1, metalLuz);

    // assento
    p(cx - 33, y0 + 28, 66, 14, c.esc);
    p(cx - 31, y0 + 30, 62, 10, c.pano);
    p(cx - 31, y0 + 30, 62, 3, c.luz);
    p(cx - 31, y0 + 38, 62, 2, '#1b222a');

    // coluna
    p(cx - 3, y0 + 42, 6, 10, metalEsc);
    p(cx - 2, y0 + 42, 2, 10, metalLuz);
    p(cx - 7, y0 + 41, 14, 3, metal);

    // base de cinco pontas
    p(cx - 21, y0 + 52, 42, 4, metalEsc);
    p(cx - 21, y0 + 52, 42, 1, metal);
    p(cx - 27, y0 + 55, 12, 3, metalEsc);
    p(cx + 15, y0 + 55, 12, 3, metalEsc);

    // rodas
    p(cx - 29, y0 + 58, 7, 5, '#1a1f26');
    p(cx - 9, y0 + 58, 7, 5, '#1a1f26');
    p(cx + 3, y0 + 58, 7, 5, '#1a1f26');
    p(cx + 23, y0 + 58, 7, 5, '#1a1f26');
  }


  function planta(ctx, x, y, tam = 1) {
    const B = 2 * tam;

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.fillRect(x - 6 * B, y + 2 * B, 12 * B, 2 * B);

    // vaso
    ctx.fillStyle = '#7a4c2c';
    ctx.fillRect(x - 5 * B, y - 4 * B, 10 * B, 6 * B);
    ctx.fillStyle = '#9a6238';
    ctx.fillRect(x - 5 * B, y - 4 * B, 10 * B, B);
    ctx.fillStyle = '#5c3720';
    ctx.fillRect(x + 3 * B, y - 3 * B, 2 * B, 5 * B);

    // folhas
    ctx.fillStyle = '#2f6b45';
    ctx.fillRect(x - 5 * B, y - 12 * B, 10 * B, 8 * B);
    ctx.fillRect(x - 7 * B, y - 9 * B, 14 * B, 5 * B);
    ctx.fillStyle = '#3f8a58';
    ctx.fillRect(x - 3 * B, y - 14 * B, 6 * B, 4 * B);
    ctx.fillRect(x - 7 * B, y - 9 * B, 4 * B, 3 * B);
    ctx.fillStyle = '#1f4a30';
    ctx.fillRect(x + 3 * B, y - 7 * B, 4 * B, 3 * B);
  }

  function tapete(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(201,162,39,.045)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 20);
    ctx.stroke();
    ctx.restore();
  }

  return {
    padrao, personagem, mesa, planta, chao, paredes, tapete,
    salaChao, salaMesa, SALA, objetos, carregarObjetos, objeto, cadeiraDaMesa,
    paredesInteriores, rotulos, MAPA, pisosZonas, objetoParcial, tampoMesa, luz, ASSENTOS,
    PELES, CABELOS, ROUPAS, corPele, corCabelo, corRoupa, tom,
  };
})();

if (typeof window !== 'undefined') window.Visual = Visual;
