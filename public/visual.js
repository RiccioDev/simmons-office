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
  function chao(ctx, largura, altura) {
    // piso em blocos (2 unidades = 1 "pixel" grande), estilo pixel art
    const B = 2;                       // tamanho do bloco
    const tabua = 46;                  // altura da tábua (em unidades)

    ctx.fillStyle = '#54402a';
    ctx.fillRect(0, 0, largura, altura);

    for (let y = 0; y < altura; y += tabua) {
      const linha = Math.round(y / tabua);
      for (let x = 0; x < largura; x += 14 * B) {
        const semente = Math.abs(Math.sin(x * 0.013 + linha * 1.7));
        const claro = semente > 0.55;
        ctx.fillStyle = claro ? 'rgba(255,236,196,.075)' : 'rgba(0,0,0,.035)';
        ctx.fillRect(x, y + B, 14 * B - B, tabua - B * 2);
      }

      // veio
      ctx.fillStyle = 'rgba(0,0,0,.13)';
      ctx.fillRect(0, y + tabua - B, largura, B);

      // junta curta alternada
      const desloc = (linha % 2) * 45 * B;
      for (let x = desloc; x < largura; x += 90 * B) {
        ctx.fillRect(x, y, B, tabua);
      }
    }

    // vinheta escura nas bordas
    const g = ctx.createLinearGradient(0, 0, 0, altura);
    g.addColorStop(0, 'rgba(0,0,0,.30)');
    g.addColorStop(0.25, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, largura, altura);
  }

  function paredes(ctx, largura, altura) {
    const esp = 26;

    // parede de cima
    ctx.fillStyle = '#1a1f26';
    ctx.fillRect(0, 0, largura, esp);
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillRect(0, esp - 4, largura, 4);

    // parede da esquerda
    ctx.fillStyle = '#171c22';
    ctx.fillRect(0, 0, esp, altura);
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    ctx.fillRect(esp - 4, esp, 4, altura - esp);

    // janelas na parede de cima (dão ar de escritório)
    const janelas = [[360, 150], [1080, 150]];
    for (const [jx, jw] of janelas) {
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(jx - 4, 5, jw + 8, 21);

      const grad = ctx.createLinearGradient(jx, 6, jx, 22);
      grad.addColorStop(0, 'rgba(150,205,235,.85)');
      grad.addColorStop(0.55, 'rgba(96,150,190,.75)');
      grad.addColorStop(1, 'rgba(58,96,128,.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(jx, 8, jw, 16);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(jx - 4, 24, jw + 8, 2);

      // caixilho
      ctx.strokeStyle = 'rgba(20,26,32,.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(jx + jw / 2, 8);
      ctx.lineTo(jx + jw / 2, 24);
      ctx.stroke();

      // brilho
      ctx.fillStyle = 'rgba(255,255,255,.20)';
      ctx.beginPath();
      ctx.moveTo(jx + 8, 24);
      ctx.lineTo(jx + 40, 6);
      ctx.lineTo(jx + 62, 6);
      ctx.lineTo(jx + 30, 24);
      ctx.closePath();
      ctx.fill();
    }

    // rodapé
    ctx.strokeStyle = 'rgba(201,162,39,.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(esp, esp + 1);
    ctx.lineTo(largura, esp + 1);
    ctx.moveTo(esp + 1, esp);
    ctx.lineTo(esp + 1, altura);
    ctx.stroke();
  }

  // mesa em pixel art: tampo de madeira, monitor, teclado, candeeiro, planta
  function mesa(ctx, d, estado = {}) {
    const { x, y, w, h } = d;
    const minha = !!estado.minha;
    const trancada = !!estado.trancada;
    const ocupada = !!estado.ocupada;
    const B = 2;

    const madeira = trancada ? '#6b5233' : (minha ? '#7a5c36' : '#6d5233');
    const topo = tom(madeira, 1.22);
    const escuro = tom(madeira, 0.66);

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fillRect(x + 3 * B, y + 4 * B, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(x + 4 * B, y + 5 * B, w, h);

    // tampo
    ctx.fillStyle = madeira;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = topo;
    ctx.fillRect(x + B, y + B, w - 2 * B, B * 2);          // brilho superior
    ctx.fillStyle = escuro;
    ctx.fillRect(x, y + h - B * 3, w, B * 3);              // espessura

    // tábuas
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    for (let tx = x + 12 * B; tx < x + w; tx += 16 * B) ctx.fillRect(tx, y + B, B, h - 3 * B);

    // rebordo
    ctx.strokeStyle = trancada ? '#e08b57' : (minha ? '#e5c25c' : 'rgba(0,0,0,.45)');
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    const mx = Math.round(x + w / 2);

    // monitor
    ctx.fillStyle = '#14171c';
    ctx.fillRect(mx - 15 * B, y + 5 * B, 30 * B, 12 * B);
    ctx.fillStyle = ocupada ? '#2f7f72' : '#213040';
    ctx.fillRect(mx - 14 * B, y + 6 * B, 28 * B, 10 * B);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(mx - 13 * B, y + 7 * B, 26 * B, B);
    // base do monitor
    ctx.fillStyle = '#1b1f25';
    ctx.fillRect(mx - 4 * B, y + 17 * B, 8 * B, 2 * B);

    // teclado
    ctx.fillStyle = '#20252c';
    ctx.fillRect(mx - 11 * B, y + 21 * B, 22 * B, 5 * B);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    for (let kx = mx - 10 * B; kx < mx + 10 * B; kx += 3 * B) ctx.fillRect(kx, y + 22 * B, 2 * B, 3 * B);
    // rato
    ctx.fillStyle = '#20252c';
    ctx.fillRect(mx + 13 * B, y + 22 * B, 3 * B, 4 * B);

    // candeeiro
    ctx.fillStyle = '#3a3f48';
    ctx.fillRect(x + 4 * B, y + 4 * B, 3 * B, 2 * B);
    ctx.fillStyle = 'rgba(255,235,170,.55)';
    ctx.fillRect(x + 4 * B, y + 6 * B, 3 * B, 2 * B);

    // planta
    ctx.fillStyle = '#6b4b2f';
    ctx.fillRect(x + w - 9 * B, y + 4 * B, 4 * B, 3 * B);
    ctx.fillStyle = '#35764c';
    ctx.fillRect(x + w - 10 * B, y + 2 * B, 6 * B, 2 * B);
    ctx.fillRect(x + w - 8 * B, y + 1 * B, 2 * B, 2 * B);

    // placa com o nome
    const larg = Math.min(w - 6 * B, 56 * B);
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(x + 3 * B, y + h - 11 * B, larg, 7 * B);
    ctx.fillStyle = d.owner ? '#e5c25c' : '#8d97a4';
    ctx.font = '600 11px "Segoe UI",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText((d.owner || d.label).slice(0, 16), x + 5 * B, y + h - 7.5 * B);

    if (trancada) {
      ctx.font = '12px "Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔒', x + w - 3 * B, y + h - 6 * B);
    }

    // cadeira de escritório (com alguém sentado não se vê: a pessoa está lá)
    if (!ocupada) cadeira(ctx, mx, y + h - 2 * B);
  }

  // cadeira de escritório em pixel art: encosto com malha, braços, assento,
  // coluna e base de cinco pontas com rodas
  function cadeira(ctx, cx, y0) {
    const B = 2;
    const p = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    const pano = '#3a4553', panoLuz = '#4d5a6a', panoEsc = '#242c36';
    const metal = '#5b6674', metalLuz = '#8695a6', metalEsc = '#333a44';

    // sombra no chão
    p(cx - 34, y0 + 60, 68, 5, 'rgba(0,0,0,.30)');

    // encosto (moldura + almofada + malha)
    p(cx - 30, y0, 60, 26, panoEsc);
    p(cx - 27, y0 + 2, 54, 21, pano);
    p(cx - 27, y0 + 2, 54, 3, panoLuz);
    for (let i = 0; i < 3; i++) p(cx - 25, y0 + 8 + i * 5, 50, 1, 'rgba(255,255,255,.07)');
    p(cx - 6, y0 + 2, 3, 21, 'rgba(255,255,255,.05)');

    // braços
    p(cx - 38, y0 + 20, 9, 12, metalEsc);
    p(cx + 29, y0 + 20, 9, 12, metalEsc);
    p(cx - 40, y0 + 18, 12, 4, metal);
    p(cx + 28, y0 + 18, 12, 4, metal);
    p(cx - 40, y0 + 18, 12, 1, metalLuz);
    p(cx + 28, y0 + 18, 12, 1, metalLuz);

    // assento
    p(cx - 33, y0 + 28, 66, 14, panoEsc);
    p(cx - 31, y0 + 30, 62, 10, pano);
    p(cx - 31, y0 + 30, 62, 3, panoLuz);
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
    PELES, CABELOS, ROUPAS, corPele, corCabelo, corRoupa, tom,
  };
})();

if (typeof window !== 'undefined') window.Visual = Visual;
