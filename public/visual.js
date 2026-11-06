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
  function chao(ctx, largura, altura, escala) {
    // piso de madeira: tábuas longas, juntas alternadas, variação subtil
    ctx.fillStyle = '#2b2218';
    ctx.fillRect(0, 0, largura, altura);

    const alt = 54;              // altura da tábua
    const comprimento = 460;     // comprimento médio

    let fila = 0;
    for (let y = 0; y < altura; y += alt) {
      const deslocamento = (fila % 2) * (comprimento / 2);
      fila++;

      for (let x = -comprimento; x < largura + comprimento; x += comprimento) {
        const px = x + deslocamento;
        const semente = Math.abs(Math.sin((px * 0.017) + (y * 0.031)));
        const variacao = 0.016 + semente * 0.015;

        ctx.fillStyle = 'rgba(226,198,150,' + variacao.toFixed(3) + ')';
        ctx.fillRect(px + 1, y + 1, comprimento - 2, alt - 2);

        // veio da madeira
        ctx.fillStyle = 'rgba(0,0,0,' + (0.030 + semente * 0.030).toFixed(3) + ')';
        ctx.fillRect(px + comprimento * 0.35, y + alt * 0.28, comprimento * 0.3, 1.5);
        ctx.fillRect(px + comprimento * 0.18, y + alt * 0.62, comprimento * 0.45, 1.2);

        // junta vertical
        ctx.fillStyle = 'rgba(0,0,0,.13)';
        ctx.fillRect(px, y, 1.2, alt);
      }

      // junta horizontal
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(0, y + alt - 1, largura, 1.2);
    }
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

  // mesa vista de cima: tampo de madeira, monitor, teclado, cadeira
  function mesa(ctx, d, estado = {}) {
    const { x, y, w, h } = d;
    const minha = !!estado.minha;
    const trancada = !!estado.trancada;
    const ocupada = !!estado.ocupada;

    ctx.save();

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 8, w, h, 10);
    ctx.fill();

    // tampo
    ctx.fillStyle = trancada ? '#5a4632' : (minha ? '#6a5439' : '#5f4b34');
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();

    // veio da madeira
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.020 + i * 0.006) + ')';
      ctx.fillRect(x, y + 8 + i * 17, w, 6);
    }
    ctx.restore();

    // espessura (frente do tampo)
    ctx.fillStyle = tom(trancada ? '#5a4632' : (minha ? '#6a5439' : '#5f4b34'), 0.72);
    ctx.beginPath();
    ctx.roundRect(x + 3, y + h - 6, w - 6, 9, 5);
    ctx.fill();

    // rebordo
    ctx.strokeStyle = trancada ? '#c26a3a' : (minha ? '#c9a227' : 'rgba(0,0,0,.45)');
    ctx.lineWidth = trancada || minha ? 2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.stroke();

    // monitor (ao centro/fundo do tampo)
    const mx = x + w / 2, my = y + 26;
    ctx.fillStyle = '#15181d';
    ctx.beginPath();
    ctx.roundRect(mx - 30, my - 14, 60, 26, 4);
    ctx.fill();
    ctx.fillStyle = ocupada ? '#2f6f66' : '#22303d';
    ctx.beginPath();
    ctx.roundRect(mx - 26, my - 11, 52, 18, 2);
    ctx.fill();
    // teclado
    ctx.fillStyle = '#20262e';
    ctx.beginPath();
    ctx.roundRect(mx - 22, my + 16, 44, 12, 3);
    ctx.fill();
    // rato
    ctx.beginPath();
    ctx.ellipse(mx + 30, my + 22, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // candeeiro
    ctx.fillStyle = '#8a7a55';
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,180,.30)';
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 13, 0, Math.PI * 2);
    ctx.fill();

    // planta pequena
    ctx.fillStyle = '#3f6b46';
    ctx.beginPath();
    ctx.arc(x + w - 22, y + 18, 7, 0, Math.PI * 2);
    ctx.arc(x + w - 30, y + 21, 5, 0, Math.PI * 2);
    ctx.fill();

    // cadeira: só aparece quando a mesa está vazia (com alguém, a pessoa tapa-a)
    if (!ocupada) {
      ctx.fillStyle = 'rgba(0,0,0,.20)';
      ctx.beginPath();
      ctx.ellipse(mx, y + h + 8, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2b333d';
      ctx.beginPath();
      ctx.roundRect(mx - 19, y + h - 1, 38, 11, 5);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.beginPath();
      ctx.roundRect(mx - 15, y + h + 2, 30, 3, 1.5);
      ctx.fill();
    }

    // placa com o nome de quem é a mesa
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + h - 26, Math.min(w - 20, 116), 18, 5);
    ctx.fill();
    ctx.fillStyle = d.owner ? '#e5c25c' : '#7b8593';
    ctx.font = '600 11px "Segoe UI",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText((d.owner || d.label).slice(0, 16), x + 17, y + h - 17);

    // cadeado
    if (trancada) {
      ctx.font = '13px "Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔒', x + w - 12, y + h - 16);
    }

    ctx.restore();
  }

  function planta(ctx, x, y, tam = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(tam, tam);

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6b4b2f';
    ctx.beginPath();
    ctx.roundRect(-11, -6, 22, 16, 4);
    ctx.fill();

    ctx.fillStyle = '#2f6b45';
    for (const [dx, dy, r] of [[-8, -16, 11], [7, -18, 12], [0, -26, 13], [-12, -26, 9], [12, -25, 9]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.arc(-3, -28, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
