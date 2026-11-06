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

    // tampo (sprite do pack; a cor vem da tinta)
    objeto(ctx, TABELAS[est.mesa] || TABELAS.carvalho, cx, y + h, w);

    // tudo o que está em cima assenta a esta altura
    const tampo = y + h - 26;

    // computador
    const pc = est.pc || 'monitor';
    if (pc === 'dual') {
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx - 15, tampo, 28);
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx + 15, tampo, 28);
    } else if (pc === 'portatil') {
      objeto(ctx, 'Computer_LaptopBlackDown', cx, tampo, 30);
    } else if (pc === 'torre') {
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx - 6, tampo, 28);
      objeto(ctx, 'Office_Props_Folders', cx + 22, tampo - 6, 14);
    } else {
      objeto(ctx, 'Office_Computer_ScreenBlackUp', cx, tampo, 30);
    }

    // decorações dos cantos
    const decor = (nome, px) => {
      const spr = DECORACOES[nome];
      if (spr) objeto(ctx, spr, px, tampo - 16, 18);
    };
    decor(est.decor, x + 11);
    decor(est.decor2, x + w - 11);

    // placa do nome, à frente do tampo (não cruza com quem está sentado)
    if (d.owner || d.label) {
      const nome = String(d.owner || d.label).slice(0, 16);
      ctx.font = '600 6px "Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const larg = Math.min(w - 10, ctx.measureText(nome).width + 8);
      ctx.fillStyle = 'rgba(12,15,20,.5)';
      ctx.fillRect(cx - larg / 2, y + h - 16, larg, 9);
      ctx.fillStyle = d.owner ? '#e5c25c' : '#93a0ad';
      ctx.fillText(nome, cx, y + h - 11.5);
    }

    if (trancada) {
      ctx.font = '7px "Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', x + w - 4, y + h - 11);
    }

  }


  // cadeira do lado de quem se senta (atrás da mesa): desenhada antes do
  // boneco, para o encosto aparecer por trás dele
  function cadeiraDaMesa(ctx, d) {
    const est = d.estilo || {};
    const cx = Math.round(d.x + d.w / 2);
    const sprite = {
      escritorio: 'Chair_ChairBlueUp',
      gamer: 'Chair_ChairRedUp',
      madeira: 'Chair_ChairGreenUp',
      banco: 'Chair_ChairGreyUp',
    }[est.cadeira] || 'Chair_ChairBlueUp';
    objeto(ctx, sprite, cx, d.y + 18, 30);
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

  // ---------------------------------------------------- objetos do escritório
  function objetos(ctx) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    // ============================================================ GABINETE (200..470 × 92..330)
    p(214, 150, 60, 8, 'rgba(0,0,0,.28)');
    objeto(ctx, 'Shelf_ShelfBig', 250, 236, 56);
    objeto(ctx, 'Shelf_Shelf', 300, 236, 56);
    objeto(ctx, 'Table_TableDarkBrown', 372, 300, 64);
    objeto(ctx, 'Office_Computer_ScreenBlackUp', 372, 236, 30);
    objeto(ctx, 'Chair_ChairBlueUp', 372, 200, 28);
    objeto(ctx, 'Office_Plant_Plant', 440, 320, 56);
    objeto(ctx, 'Office_Props_Book1', 350, 292, 16);

    // ============================================================ COPA (520..1020 × 92..300)
    // bancada comprida encostada à parede
    p(548, 156, 300, 46, '#5a4026');
    p(548, 152, 300, 8, '#6d5132');
    p(548, 152, 300, 2, 'rgba(255,255,255,.14)');
    p(548, 196, 300, 6, 'rgba(0,0,0,.28)');
    for (let i = 0; i < 4; i++) {
      p(554 + i * 74, 162, 68, 34, '#4a3521');
      p(554 + i * 74, 162, 68, 2, 'rgba(255,255,255,.06)');
      p(586 + i * 74, 176, 6, 2, '#8a7350');
    }
    objeto(ctx, 'Office_Props_CoffeeDispenser', 590, 154, 32);
    objeto(ctx, 'Office_Props_Mugs', 640, 154, 16);
    objeto(ctx, 'Office_Props_Folders', 700, 154, 20);
    objeto(ctx, 'Office_Props_Basket', 742, 154, 20);
    objeto(ctx, 'Office_Props_Book1', 800, 154, 16);

    // ilha central com dois bancos
    objeto(ctx, 'Table_TableSmallWhite', 700, 268, 40);
    objeto(ctx, 'Chair_ChairGreyUp', 668, 276, 24);
    objeto(ctx, 'Chair_ChairGreyUp', 732, 276, 24);
    objeto(ctx, 'Office_Props_Mugs', 700, 238, 14);

    // sofá e plantas da copa
    p(866, 240, 116, 36, 'rgba(0,0,0,.18)');
    objeto(ctx, 'Furniture_Couch_CouchBrownDown', 924, 284, 110);
    objeto(ctx, 'Office_Plant_PlantLarge', 550, 288, 62);
    objeto(ctx, 'Office_Plant_PlantSmall', 1000, 210, 30);
    objeto(ctx, 'Office_Props_Clock', 860, 150, 22);

    // ============================================================ RECEPÇÃO (40..360 × 700..960)
    // balcão de recepção
    p(74, 742, 180, 54, '#4b3524');
    p(74, 738, 180, 8, '#634728');
    p(74, 738, 180, 2, 'rgba(255,255,255,.16)');
    p(74, 790, 180, 6, 'rgba(0,0,0,.30)');
    objeto(ctx, 'Office_Computer_ScreenWhiteUp', 150, 736, 28);
    objeto(ctx, 'Office_Props_Basket', 196, 736, 16);
    // mesa de espera + cadeiras
    objeto(ctx, 'Table_TableSmallWhite', 200, 880, 34);
    objeto(ctx, 'Chair_ChairGreyUp', 164, 888, 26);
    objeto(ctx, 'Chair_ChairGreyUp', 236, 888, 26);
    objeto(ctx, 'Chair_ChairBlueUp', 200, 830, 26);
    objeto(ctx, 'Office_Plant_PlantLarge', 66, 940, 60);
    objeto(ctx, 'Office_Plant_PlantSmall', 320, 760, 28);
    objeto(ctx, 'Shelf_Shelf', 300, 900, 52);

    // ============================================================ LOUNGE (1020..1380 × 700..960)
    p(1060, 760, 130, 40, 'rgba(0,0,0,.20)');
    objeto(ctx, 'Furniture_Couch_CouchBrownDown', 1130, 800, 120);
    objeto(ctx, 'Furniture_Couch_CouchGreyDown', 1130, 920, 120);
    objeto(ctx, 'Table_TableSmallWhite', 1130, 872, 36);
    objeto(ctx, 'Office_Props_Mugs', 1122, 848, 14);
    objeto(ctx, 'Office_Plant_Plant', 1060, 840, 62);
    objeto(ctx, 'Office_Plant_PlantLarge', 1330, 860, 58);
    objeto(ctx, 'Office_Props_Bin', 1046, 730, 18);
    objeto(ctx, 'Office_Props_Mirror', 1350, 740, 26);

    // ============================================================ ESTAÇÕES: plantas nos cantos
    objeto(ctx, 'Office_Plant_PlantLarge', 392, 690, 62);
    objeto(ctx, 'Office_Plant_PlantLarge', 920, 690, 62);
    objeto(ctx, 'Office_Plant_PlantSmall', 392, 356, 28);
    objeto(ctx, 'Office_Plant_PlantSmall', 930, 356, 28);
    objeto(ctx, 'Office_Props_Bin', 912, 470, 18);
  }

  // ---------------------------------------------------- sala de reunião  // ---------------------------------------------------- sala de reunião  // ---------------------------------------------------- sala de reunião
  // fica à direita do escritório: caminha-se para a direita para entrar.
  // Aqui o raio de distância não conta — todos se ouvem.
  const SALA = { x: 1080, y: 92, w: 300, h: 338 };

  function salaChao(ctx) {
    // o piso da sala é a zona "xadrez" da planta; aqui só a porta de vidro
  }

  function salaMesa(ctx) {
    const cx = Math.round(SALA.x + SALA.w / 2);

    // mesa comprida (três módulos do pack)
    for (let i = 0; i < 2; i++) {
      objeto(ctx, 'Table_TableBrown', cx, 236 + i * 58, 64);
    }

    // três cadeiras de cada lado
    for (let i = 0; i < 3; i++) {
      objeto(ctx, 'Chair_ChairBlueUp', cx - 52, 250 + i * 44, 26);
      objeto(ctx, 'Chair_ChairBlueUp', cx + 52, 250 + i * 44, 26);
    }

    // ecrã de projeção na parede
    ctx.fillStyle = '#1b2530';
    ctx.fillRect(cx - 54, 104, 108, 40);
    const g = ctx.createLinearGradient(0, 108, 0, 140);
    g.addColorStop(0, 'rgba(150,205,230,.55)');
    g.addColorStop(1, 'rgba(90,140,175,.35)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 51, 107, 102, 34);

    // plantas aos cantos
    objeto(ctx, 'Office_Plant_PlantSmall', SALA.x + 24, 260, 30);
    objeto(ctx, 'Office_Plant_PlantSmall', SALA.x + SALA.w - 22, 260, 30);
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
    paredesInteriores, rotulos, MAPA, pisosZonas,
    PELES, CABELOS, ROUPAS, corPele, corCabelo, corRoupa, tom,
  };
})();

if (typeof window !== 'undefined') window.Visual = Visual;
