# Simmons Office

Escritório virtual 2D para a equipa Simmons Dellion. Corre no teu PC e fica acessível
de qualquer lugar através de um link HTTPS.

Cada pessoa tem a sua mesa, com cadeado. Voz e vídeo ligam só quando dois avatares estão
perto, para ninguém ter de ouvir o escritório inteiro.

## Como arrancar

1. Duplo clique em Gather.bat -> abre em http://localhost:3000
2. Duplo clique em expor.bat -> em segundos aparece o link público
   (ex.: https://office-xxxx-yyyy.trycloudflare.com), que também fica guardado em
   url_publica.txt
3. Manda esse link à equipa. Cada um abre no browser, escreve o nome, aceita o microfone
   e a câmara. Está dentro.

O link público muda cada vez que abres o expor.bat. Para um link fixo é preciso um
domínio próprio e uma conta Cloudflare (grátis) com um túnel com nome — pede-me que eu
monto.

## Controlos

- WASD ou setas — andar
- E — sentar / levantar
- R — ficar com a mesa mais próxima (e dar-lhe nome)
- L — fechar / abrir a minha mesa (cadeado)
- M — ligar / desligar o meu microfone
- C — ligar / desligar a minha câmara
- Enter no chat — escrever para todos
- 🎥 Tela cheia — aparece quando estás a falar com alguém (só nessa altura)

## A tua câmara

No canto inferior esquerdo aparece sempre a **tua própria imagem** (espelhada, como num
espelho) enquanto a câmara estiver ligada. Serve para acertares o ângulo e veres se estás
enquadrado. O som dessa janela está desligado — nunca faz eco.

## Bater à porta

Com a tua mesa fechada, ninguém fala contigo sem autorização — nem chegar perto chega.

1. A pessoa aproxima-se e carrega em **K** (aparece "porta fechada · K para bater" na mesa)
2. A ti aparece um painel com as **iniciais** dela, o nome e o nome da tua mesa
3. Toca um **som de batida** (dois toques secos) e o **título do separador pisca** —
   por isso ouves e vês mesmo estando noutra aba
4. **Abrir a porta** → só essa pessoa passa a falar contigo; **Não abrir** → ela é avisada
5. A porta aberta mantém-se só enquanto essa pessoa estiver por perto

O sino **🔔** no topo liga e desliga o som das batidas. A escolha fica guardada.

Se quem bateu se afastar ou sair, o painel fecha sozinho.

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
- A ligação é directa entre os computadores (WebRTC). O servidor só apresenta as pessoas
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
- wstest.js / wstest_publico.js — testes de ligação local e pública


## Base de dados (donos permanentes)

Quando corre no Render, as mesas ficam numa base de dados Postgres gratuita — os donos
**nunca se perdem**, nem com deploys nem com reinícios.

Quando corre no teu PC (`Gather.bat`), usa o ficheiro local `mesas.json`. Funciona igual,
só não é partilhado com a versão online.

O código escolhe sozinho: se existir a variável `DATABASE_URL`, vai para Postgres; se não,
usa o ficheiro. Se o Postgres falhar, cai no ficheiro e continua a funcionar.

## Se algo falhar

- Não ouço ninguém -> vê o candeeiro do microfone no topo; confirma que estás a menos de
  250 px da pessoa (o círculo tracejado à tua volta mostra o alcance).
- O browser não pede microfone -> tem de ser https:// ou localhost.
- O link deixou de funcionar -> fecha o expor.bat e abre outra vez; o endereço muda.
- A página não abre -> o Gather.bat tem de estar aberto noutra janela.
