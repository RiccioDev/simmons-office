# Simmons Office

Escritório virtual 2D para a equipe Simmons Dellion. Corre no teu PC e fica acessível
de qualquer lugar através de um link HTTPS.

Cada pessoa tem a sua mesa, com cadeado. Voz e vídeo ligam só quando dois avatares estão
perto, para ninguém ter de ouvir o escritório inteiro.

## Como arrancar

1. Duplo clique em Gather.bat -> abre em http://localhost:3000
2. Duplo clique em expor.bat -> em segundos aparece o link público
   (ex.: https://office-xxxx-yyyy.trycloudflare.com), que também fica salvo em
   url_publica.txt
3. Manda esse link à equipe. Cada um abre no browser, escreve o nome, aceita o microfone
   e a câmera. Está dentro.

O link público muda cada vez que abres o expor.bat. Para um link fixo é preciso um
domínio próprio e uma conta Cloudflare (grátis) com um túnel com nome — pede-me que eu
monto.

## O teu personagem (pixel art)

Os personagens são desenhados em pixel art de verdade: o boneco é composto num canvas de
32×44 pixéis e depois ampliado sem suavização — é isso que dá o aspecto nítido, com
contorno, sombreado e sombra no chão.

Personalização:

- **Gênero** feminino / masculino
- **Tom de pele**: 8
- **Cabelo**: curto, longo, coque, franja, afro, rabo de cavalo, careca
- **Cor do cabelo**: 9
- **Estilo da roupa**: camisa, terno, blazer, moletom, vestido, uniforme
- **Cor da roupa**: 10
- **Barba**: com / sem
- **Óculos**: nenhum, redondo, escuro, sol

O terno tem lapelas, camisa branca e gravata; o moletom tem capuz, bolso e cordões; o
vestido tem decote, cinta na cintura, braços à vista e saia em A que balança ao andar; o
uniforme tem gola, carcela e emblema no peito.

O boneco tem **animação de caminhada** de 4 quadros: as pernas alternam, os braços
balançam ao contrário, o corpo sobe 1 pixel a cada passo e a saia do vestido balança.

Para ver todas as combinações lado a lado, abre **`/laboratorio-personagens.html`** —
mostra 12 modelos, cada um parado e com os 4 passos.

## Sala de reunião

Em baixo no mapa, com carpete, parede de vidro com porta, ecrã de projeção e uma mesa
com oito cadeiras.

**Dentro da sala o raio de distância não conta**: quem lá está ouve todos os outros que
lá estejam, mesmo do outro lado da mesa. Ao entrar e ao sair, o chat avisa e o áudio
volta ao modo de proximidade.

## Minha mesa

Quem tem mesa pode escolher o visual dela no botão **🪑** (ao lado do 🎨). É só do dono —
ninguém muda a mesa dos outros.

- **Tampo**: carvalho, nogueira, branco, preto ou vidro
- **Computador**: monitor, dois monitores, portátil ou torre + monitor
- **Cadeira**: escritório, gamer, madeira ou banco alto
- **Decoração**: nada, planta, caneca, candeeiro, lápis, moldura, telefone ou livros —
  uma à esquerda e outra à direita do tampo
- **Aleatório** sorteia uma combinação inteira

A escolha fica guardada na conta e aparece em todos os aparelhos.

## Mesma conta em dois aparelhos

Se entrares com a mesma conta no computador e no celular, **não aparecem dois bonecos**:
é o mesmo personagem, na mesma posição. Podes andar de qualquer um dos aparelhos — o outro
acompanha. O boneco só sai do escritório quando o **último** aparelho fecha.

## Câmara e personagens (estilo WorkAdventure)

O mapa já não cabe todo no ecrã: a **câmara segue o avatar com zoom** (1,85 no
computador, 2,1 no celular), como no WorkAdventure. O escritório passa a rolar.

Os personagens têm **quatro direções** (frente, costas, esquerda, direita) com ciclo de
caminhada em cada uma — de costas vê-se a nuca e a gola, de perfil um olho só e o nariz.

## O escritório

Na primeira vez que entras, abre o criador de personagem — e podes voltar sempre pelo botão
**🎨**, no topo do chat.

Escolhes:

- **Gênero** (feminino / masculino)
- **Tom de pele** (6 tons)
- **Cabelo** (curto, longo, coque, franja, afro, careca)
- **Cor do cabelo** (7 cores)
- **Roupa** (8 cores)

A prévia à esquerda mostra o resultado em tamanho grande; **Aleatório** gera uma combinação.
Ao salvar, fica guardado na tua conta — aparece igual em qualquer aparelho, e os colegas
vêem o teu boneco com essas cores.

## Sala de reunião

Em baixo no mapa, com carpete, parede de vidro com porta, ecrã de projeção e uma mesa
com oito cadeiras.

**Dentro da sala o raio de distância não conta**: quem lá está ouve todos os outros que
lá estejam, mesmo do outro lado da mesa. Ao entrar e ao sair, o chat avisa e o áudio
volta ao modo de proximidade.

## Minha mesa

Quem tem mesa pode escolher o visual dela no botão **🪑** (ao lado do 🎨). É só do dono —
ninguém muda a mesa dos outros.

- **Tampo**: carvalho, nogueira, branco, preto ou vidro
- **Computador**: monitor, dois monitores, portátil ou torre + monitor
- **Cadeira**: escritório, gamer, madeira ou banco alto
- **Decoração**: nada, planta, caneca, candeeiro, lápis, moldura, telefone ou livros —
  uma à esquerda e outra à direita do tampo
- **Aleatório** sorteia uma combinação inteira

A escolha fica guardada na conta e aparece em todos os aparelhos.

## Mesma conta em dois aparelhos

Se entrares com a mesma conta no computador e no celular, **não aparecem dois bonecos**:
é o mesmo personagem, na mesma posição. Podes andar de qualquer um dos aparelhos — o outro
acompanha. O boneco só sai do escritório quando o **último** aparelho fecha.

## Câmara e personagens (estilo WorkAdventure)

O mapa já não cabe todo no ecrã: a **câmara segue o avatar com zoom** (1,85 no
computador, 2,1 no celular), como no WorkAdventure. O escritório passa a rolar.

Os personagens têm **quatro direções** (frente, costas, esquerda, direita) com ciclo de
caminhada em cada uma — de costas vê-se a nuca e a gola, de perfil um olho só e o nariz.

## O escritório

O chão é de madeira, com paredes, janelas, tapete e plantas. Cada mesa tem monitor,
teclado, rato, candeeiro, planta, uma placa com o nome de quem é a mesa e a cadeira (que
desaparece quando alguém se senta). Mesa trancada fica com o rebordo laranja.

Os bonecos andam de verdade: as pernas alternam ao caminhar e o corpo vira para o lado em
que andam.

## No celular e no tablet

Abre o mesmo link — o site adapta-se sozinho. Não há app para instalar.

- **Mapa**: preenche o tela e **segue o teu avatar** (no computador continua a ver-se a sala
  toda; no celular a câmera acompanha-te, com mesa legível)
- **Andar**: joystick em baixo à esquerda, ou **toca num ponto do mapa** e ele vai até lá
- **Sentar/levantar**: botão **E** no meio do joystick
- **Chat**: botão 💬 redondo em baixo à direita; o painel sobe como uma gaveta (arrasta para
  baixo para fechar)
- **Micro, câmera, tela, batidas e contas**: os mesmos botões, na barra da gaveta
- **Deitado**: o painel vira uma gaveta fina à direita, o mapa fica com o resto
- A tua câmera encolhe e não tapa os controlos

A gaveta do chat arrasta para cima (tocar na barra) e para baixo (arrastar o dedo).

## Chat: histórico, arquivos e mensagens fixadas

**Histórico de 7 dias.** As mensagens ficam guardadas no servidor e voltam a aparecer quando
entras — mesmo que feches o browser, mudes de aparelho, ou o servidor reinicie. Passados
7 dias são apagadas automaticamente.

**Ficheiros e fotos.** Botão **📎** ao lado da caixa de texto: escolhes a foto ou o arquivo
(PDF, Word, Excel, zip, vídeo) e ele é enviado. Fotos aparecem como miniatura — carregar
abre em grande; o resto aparece como cartão com o nome e o tamanho. Limite de **10 MB**.

Podes escrever uma legenda antes de escolher o arquivo e ela vai junto.

**Fixar para sempre.** Ao passar o rato numa mensagem aparece um **📌** à direita. Carregar
fixa a mensagem: ela passa para a secção **FIXADAS**, no topo do chat, e **nunca é apagada**
— nem aos 7 dias, nem num ano. Carregar outra vez no 📌 desafixa.

Os anexos ficam na base de dados, por isso as fotos também não se perdem num deploy.

## Remover alguém da equipe

Em **👥 → remover**, a conta desaparece e:

- a **mesa fica livre na hora** (dono limpo, cadeado aberto)
- se essa pessoa estiver dentro do escritório, é **tirada imediatamente** — recebe o aviso
  "A tua conta foi removida" e volta ao tela de entrada

Há ainda **Mesas ocupadas**, no mesmo painel: mostra quem tem cada mesa e um botão
**libertar**, para o caso de uma mesa ter ficado presa (por exemplo, de alguém que já saiu
do sistema antes desta regra existir).

## Controlos

- WASD ou setas — andar
- E — sentar / levantar
- R — ficar com a mesa mais próxima (e dar-lhe nome)
- L — fechar / abrir a minha mesa (cadeado)
- M — ligar / desligar o meu microfone
- C — ligar / desligar a minha câmera
- Enter no chat — escrever para todos
- 🎥 Tela cheia — aparece quando estás a falar com alguém (só nessa altura)

## A tua câmera

No canto inferior esquerdo aparece sempre a **tua própria imagem** (espelhada, como num
espelho) enquanto a câmera estiver ligada. Serve para acertares o ângulo e veres se estás
enquadrado. O som dessa janela está desligado — nunca faz eco.

## Bater à porta

Com a tua mesa fechada, ninguém fala contigo sem autorização — nem chegar perto chega.

1. A pessoa aproxima-se e carrega em **K** (aparece "porta fechada · K para bater" na mesa)
2. A ti aparece um painel com as **iniciais** dela, o nome e o nome da tua mesa
3. Toca uma **campainha em ciclo** (5 s a tocar, 20 s de silêncio, repete). Só para quando abrires, recusares ou a pessoa desistir. Começa por: Toca um **som de batida** (dois toques secos) e o **título do separador pisca** —
   por isso ouves e vês mesmo estando noutra aba
4. **Abrir a porta** → só essa pessoa passa a falar contigo; **Não abrir** → ela é avisada
5. A porta aberta mantém-se só enquanto essa pessoa estiver por perto

O sino **🔔** no topo liga e desliga o som das batidas. A escolha fica guardada.

Se quem bateu se afastar ou sair, o painel fecha sozinho.

## Os botões dizem o estado de um relance

- **Microfone** e **câmera** desligados: o botão ganha uma **linha vermelha** por cima —
  vê-se logo que estás cortado, mesmo de longe
- **Partilha de tela** ligada: o botão do computador fica com **brilho verde** e uma barra
  verde em baixo; ao parar, volta ao normal

## Partilhar o tela

Carrega em **🖥️** no topo (ou **Ctrl+T**). O Chrome pergunta o que queres partilhar — tela
inteiro, janela ou separador — e, nas opções, podes **incluir o som do computador**.

**Quem recebe decide se quer ver.** Aparece um aviso no topo — *"Maria está a partilhar o
tela"* — com o botão **Ver tela**. Nada abre sozinho. Se não quiseres, carrega no ✕ e o
aviso não volta até essa partilha acabar.

Ao abrir, o tela aparece numa **janela flutuante**, ao lado do chat:

- **continuas a ver e a andar no mapa** com a janela aberta (WASD continua a funcionar)
- **⤢** põe em tela inteiro / volta a flutuante
- **Esc** fecha só a janela (as teclas não param de funcionar)
- no modo reunião o tela entra na grelha, sem interromper nada

Há **som quando alguém começa** (dois tons a subir) e **quando termina** (dois tons a
descer) — para não passares a partilha sem dar conta.

Para parar há três caminhos: o **Parar** na barra vermelha, o mesmo botão 🖥️, ou o "Parar
partilha" do próprio Chrome. Parar a partilha **não corta a voz**.

## Modo reunião (tela cheia)

Quando chegas perto de alguém e a chamada liga, aparece o botão **🎥 Tela cheia** no fundo
do mapa. Ao carregar:

- o escritório sai da frente e os participantes aparecem em tiles grandes, como no Zoom
- o teu tile está espelhado e diz "(tu)"; o do colega mostra o nome dele
- com 2 pessoas ficam lado a lado; com 3 ou mais passa a grelha 2×2
- **Esc** ou "Voltar ao escritório" fecha e volta ao mapa

Se a pessoa se afastar, o tile desaparece sozinho; se não ficar ninguém, a sala fecha.

## Como funcionam as mesas

- Quem reclama primeiro fica dono. Carregas R perto de uma mesa livre, escreves o nome que
  queres que fique na mesa (nome completo, cargo, o que preferires) e confirmas.
- O dono e o estado do cadeado ficam em mesas.json — sobrevivem a reinícios.
- Fechada (cadeado fechado): só o dono se senta. Aberta: qualquer pessoa se senta.
- Ao entrar, se o teu nome já for dono de uma mesa, apareces ao lado dela.

## Voz e vídeo por proximidade

- A menos de 250 px de alguém -> áudio e vídeo ligam-se sozinhos.
- Acima de 320 px -> desligam.
- O vídeo aparece num cartão por cima do avatar da pessoa.
- A conexão é directa entre os computadores (WebRTC). O servidor só apresenta as pessoas
  umas às outras — a voz e a imagem não passam por ele.
- Há servidores STUN e TURN públicos configurados, para funcionar mesmo com os colegas em
  redes diferentes (outra operadora, 4G, etc.).

## Ficheiros

- Gather.bat — arranca o servidor e abre o browser
- expor.bat — abre o acesso de fora (link HTTPS)
- server.js — estado do escritório + sinalização WebRTC (porta 3000)
- expor.js — lança o túnel Cloudflare e mostra o link
- public/index.html, style.css, app.js — interface, aparência e lógica do cliente
- mesas.json — donos e cadeados (criado automaticamente)
- url_publica.txt — último link público gerado
- cloudflared.exe — programa que cria o túnel
- wstest.js / wstest_publico.js — testes de conexão local e pública


## Base de dados (donos permanentes)

Quando corre no Render, as mesas ficam numa base de dados Postgres gratuita — os donos
**nunca se perdem**, nem com deploys nem com reinícios.

Quando corre no teu PC (`Gather.bat`), usa o arquivo local `mesas.json`. Funciona igual,
só não é partilhado com a versão online.

O código escolhe sozinho: se existir a variável `DATABASE_URL`, vai para Postgres; se não,
usa o arquivo. Se o Postgres falhar, cai no arquivo e continua a funcionar.

## Se algo falhar

- Não ouço ninguém -> vê o candeeiro do microfone no topo; confirma que estás a menos de
  250 px da pessoa (o círculo tracejado à tua volta mostra o alcance).
- O browser não pede microfone -> tem de ser https:// ou localhost.
- O link deixou de funcionar -> fecha o expor.bat e abre outra vez; o endereço muda.
- A página não abre -> o Gather.bat tem de estar aberto noutra janela.
