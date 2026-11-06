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
    const tabua = 26;                  // altura da tábua (em unidades)

    ctx.fillStyle = '#54402a';
    ctx.fillRect(0, 0, largura, altura);

    for (let y = 0; y < altura; y += tabua) {
      const linha = Math.round(y / tabua);
      for (let x = 0; x < largura; x += 9 * B) {
        const semente = Math.abs(Math.sin(x * 0.013 + linha * 1.7));
        const claro = semente > 0.55;
        ctx.fillStyle = claro ? 'rgba(255,236,196,.075)' : 'rgba(0,0,0,.035)';
        ctx.fillRect(x, y + B, 9 * B - B, tabua - B * 2);
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
  // ---------------------------------------------------------------- mesa
  // cada pessoa escolhe o tampo, o computador, a cadeira e as decorações
  const TAMPOS = {
    carvalho: { tampo: '#7a5c36', luz: '#9d7c4c', esc: '#4b3720', veio: 'rgba(0,0,0,.12)' },
    nogueira: { tampo: '#5b3a25', luz: '#7d5437', esc: '#33200f', veio: 'rgba(0,0,0,.16)' },
    branco:   { tampo: '#d5d1c6', luz: '#efece4', esc: '#9b968b', veio: 'rgba(0,0,0,.05)' },
    preto:    { tampo: '#34383f', luz: '#4a5058', esc: '#1b1e23', veio: 'rgba(255,255,255,.05)' },
    vidro:    { tampo: '#6f9aa8', luz: '#b6d6de', esc: '#42636f', veio: 'rgba(255,255,255,.10)' },
  };

  function mesa(ctx, d, estado = {}) {
    let { x, y, w, h } = d;
    const k = w / 180;                     // escala da mesa (a arte é desenhada em 180x90)
    const minha = !!estado.minha;
    const trancada = !!estado.trancada;
    const ocupada = !!estado.ocupada;
    const est = d.estilo || {};
    const B = 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    x = 0; y = 0; w = 180; h = 90;

    const pal = TAMPOS[est.mesa] || TAMPOS.carvalho;
    const tampo = trancada ? tom(pal.tampo, 0.88) : pal.tampo;

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fillRect(x + 3 * B, y + 4 * B, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(x + 4 * B, y + 5 * B, w, h);

    // tampo
    ctx.fillStyle = tampo;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pal.luz;
    ctx.fillRect(x + B, y + B, w - 2 * B, 2 * B);
    ctx.fillStyle = pal.esc;
    ctx.fillRect(x, y + h - 3 * B, w, 3 * B);

    // veios / juntas
    ctx.fillStyle = pal.veio;
    if (est.mesa === 'vidro') {
      ctx.fillRect(x + 4 * B, y + 6 * B, w - 8 * B, B);
      ctx.fillRect(x + 4 * B, y + h - 8 * B, w - 8 * B, B);
    } else {
      for (let tx = x + 12 * B; tx < x + w; tx += 16 * B) ctx.fillRect(tx, y + B, B, h - 3 * B);
    }

    // rebordo
    ctx.strokeStyle = trancada ? '#e08b57' : (minha ? '#e5c25c' : 'rgba(0,0,0,.45)');
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    const mx = Math.round(x + w / 2);

    // decorações nos cantos do tampo
    decoracao(ctx, x + 10 * B, y + 30, est.decor, B);
    decoracao(ctx, x + w - 14 * B, y + 24, est.decor2, B);

    // computador
    computador(ctx, mx, y, est.pc, ocupada, B);

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

    // cadeira (com alguém sentado não se vê: a pessoa está lá)
    if (!ocupada) cadeira(ctx, mx, y + h - 2 * B, est.cadeira);

    ctx.restore();
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

  // ---------------------------------------------------- sala de reunião
  // fica à direita do escritório: caminha-se para a direita para entrar.
  // Aqui o raio de distância não conta — todos se ouvem.
  const SALA = { x: 930, y: 140, w: 380, h: 700 };

  function salaReuniao(ctx) {
    const { x, y, w, h } = SALA;
    const p = (dx, dy, dw, dh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + dx), Math.round(y + dy), dw, dh); };

    const vidro = 'rgba(170,215,238,.34)';
    const vidroLuz = 'rgba(200,238,250,.55)';
    const moldura = '#39465a';
    const molduraLuz = '#55657c';
    const carpete = '#2c3646';

    // ---- carpete
    p(0, 0, w, h, carpete);
    for (let i = 0; i < h; i += 12) p(0, i, w, 1, 'rgba(255,255,255,.020)');
    p(0, 0, w, 2, 'rgba(0,0,0,.35)');

    // ---- paredes: topo, fundo e a parede de vidro à esquerda (com porta)
    const paredeE = 14;
    const portaY = 300, portaH = 140;

    p(0, 0, w, 12, moldura);            // topo
    p(0, h - 10, w, 10, moldura);       // fundo

    // parede de vidro à esquerda, com vão para a porta
    p(0, 0, paredeE, portaY, moldura);
    p(0, portaY + portaH, paredeE, h - portaY - portaH, moldura);
    p(3, 3, paredeE - 6, portaY - 6, vidro);
    p(3, portaY + portaH + 3, paredeE - 6, h - portaY - portaH - 8, vidro);
    // reflexos
    p(3, 3, 1, portaY - 6, vidroLuz);
    p(3, portaY + portaH + 3, 1, h - portaY - portaH - 8, vidroLuz);
    // ombreiras
    p(0, portaY - 4, paredeE + 3, 4, molduraLuz);
    p(0, portaY + portaH, paredeE + 3, 4, molduraLuz);
    // porta encostada (aberta)
    p(1, portaY + 2, 11, 16, 'rgba(180,220,240,.32)');

    // ---- ecrã de projeção na parede de cima
    const cx = Math.round(w / 2);
    p(cx - 92, 12, 184, 3, '#151a21');
    p(cx - 88, 15, 176, 8, 'rgba(120,210,220,.28)');
    p(cx - 88, 15, 176, 1, 'rgba(190,240,250,.45)');

    // ---- tapete sob a mesa
    const tw = 140, th = 440;
    const tx = Math.round((w - tw) / 2) + 8, ty = 128;
    p(tx - 34, ty - 26, tw + 68, th + 52, 'rgba(255,255,255,.028)');

    // ---- cadeiras: 4 de cada lado da mesa
    const cadeiraV = (borda, cy2, paraDireita) => {
      const OUT = '#141a22', ENC = '#556781', ENC_LUZ = '#7b8ea8', ASS = '#3f4a5b', ASS_LUZ = '#55637a';
      if (!paraDireita) {
        p(borda - 2, cy2 - 18, 26, 36, 'rgba(0,0,0,.35)');   // sombra
        p(borda, cy2 - 22, 22, 44, OUT);                     // encosto
        p(borda + 2, cy2 - 20, 18, 40, ENC);
        p(borda + 2, cy2 - 20, 18, 4, ENC_LUZ);
        p(borda + 4, cy2 - 12, 14, 2, 'rgba(255,255,255,.07)');
        p(borda + 22, cy2 - 17, 26, 34, OUT);                // assento
        p(borda + 24, cy2 - 15, 22, 30, ASS);
        p(borda + 24, cy2 - 15, 22, 3, ASS_LUZ);
        p(borda + 26, cy2 + 12, 18, 2, 'rgba(0,0,0,.35)');
      } else {
        p(borda - 24, cy2 - 18, 26, 36, 'rgba(0,0,0,.35)');
        p(borda - 22, cy2 - 22, 22, 44, OUT);
        p(borda - 20, cy2 - 20, 18, 40, ENC);
        p(borda - 20, cy2 - 20, 18, 4, ENC_LUZ);
        p(borda - 18, cy2 - 12, 14, 2, 'rgba(255,255,255,.07)');
        p(borda - 48, cy2 - 17, 26, 34, OUT);
        p(borda - 46, cy2 - 15, 22, 30, ASS);
        p(borda - 46, cy2 - 15, 22, 3, ASS_LUZ);
        p(borda - 44, cy2 + 12, 18, 2, 'rgba(0,0,0,.35)');
      }
    };

    for (let i = 0; i < 4; i++) {
      const cy2 = ty + 70 + i * 110;
      cadeiraV(tx - 52, cy2, false);      // encosto à esquerda, assento virado à mesa
      cadeiraV(tx + tw + 52, cy2, true);  // espelhado do lado direito
    }

    // ---- mesa comprida na vertical
    p(tx + 8, ty + 8, tw, th, 'rgba(0,0,0,.36)');
    p(tx, ty, tw, th, '#6d5233');
    p(tx, ty, 4, th, '#9c7c4c');
    p(tx + tw - 6, ty, 6, th, '#3f2f1c');
    p(tx + 5, ty + th / 2 - 3, tw - 11, 6, 'rgba(0,0,0,.15)');

    // ---- objetos em cima da mesa
    p(tx + 46, ty + 26, 50, 30, '#e8e4da');        // papéis
    p(tx + 54, ty + 35, 34, 2, '#b9b3a6');
    p(tx + 62, ty + 43, 24, 2, '#b9b3a6');
    p(tx + 44, ty + 118, 38, 26, '#2f3540');       // portátil
    p(tx + 48, ty + 121, 30, 18, '#1b2027');
    p(tx + 48, ty + 121, 30, 1, 'rgba(255,255,255,.12)');
    p(tx + 62, ty + 212, 18, 20, '#20252c');       // jarro
    p(tx + 66, ty + 202, 11, 11, '#3f8a58');
    p(tx + 69, ty + 198, 5, 5, '#5cae74');
    p(tx + 46, ty + 306, 46, 30, '#e8e4da');       // papéis 2
    p(tx + 54, ty + 316, 30, 2, '#b9b3a6');
    p(tx + 54, ty + 324, 20, 2, '#b9b3a6');
    p(tx + 58, ty + 392, 14, 14, '#e3e0d8');       // caneca
    p(tx + 72, ty + 395, 3, 5, '#e3e0d8');
    p(tx + 60, ty + 394, 9, 2, '#6b4433');

    // ---- plantas nos cantos
    const planta = (px2, py2) => {
      p(px2 - 9, py2 - 14, 18, 16, '#3f8a58');
      p(px2 - 6, py2 - 22, 12, 10, '#2f6b45');
      p(px2 - 3, py2 - 27, 7, 7, '#5cae74');
      p(px2 - 8, py2 + 2, 16, 8, '#7a4c2c');
      p(px2 - 8, py2 + 2, 16, 2, '#9a6238');
    };
    planta(44, 175);
    planta(44, 595);

    // ---- placa junto à porta
    ctx.fillStyle = 'rgba(201,162,39,.55)';
    ctx.font = '600 10px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SALA DE REUNIÃO · todos se ouvem', x + w / 2, y + h - 12);
  }

  // ---------------------------------------------------- cadeiras
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
    salaReuniao, SALA,
    PELES, CABELOS, ROUPAS, corPele, corCabelo, corRoupa, tom,
  };
})();

if (typeof window !== 'undefined') window.Visual = Visual;
