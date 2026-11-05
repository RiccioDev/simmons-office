# Pôr online no Render (grátis, link fixo)

O projeto já está preparado: `render.yaml` descreve tudo o que o Render precisa.

## 1. Criar o repositório no GitHub

1. Abre <https://github.com/new>
2. Nome: **simmons-office**
3. Marca **Public** (o Render lê repositórios públicos no plano grátis)
4. **Não** marques "Add a README"
5. **Create repository**

Copia o endereço que aparece (algo como `https://github.com/o-teu-utilizador/simmons-office.git`).

## 2. Enviar o código

Do lado de cá eu faço o `git push`. Na primeira vez o Windows abre uma janela a pedir
para entrares no GitHub — é o Git Credential Manager, autoriza e fica guardado.

## 3. Criar o serviço no Render

1. Entra em <https://dashboard.render.com>
2. **New +** → **Blueprint**
3. Escolhe o repositório **simmons-office**
4. **Apply** — o Render lê o `render.yaml` e cria o serviço sozinho

Ao fim de 2-3 minutos fica em algo como `https://simmons-office.onrender.com`.

## O que esperar do plano grátis

- **Adormece após 15 minutos sem uso.** No primeiro acesso do dia esperas 30-60 s.
  A partir daí fica rápido enquanto estiver a ser usado.
- **O ficheiro `mesas.json` não é permanente.** Num novo deploy ou reinício, os donos das
  mesas voltam a estar livres. Se isso incomodar, liga-se uma base de dados gratuita
  (o Render dá um Postgres grátis) — diz-me e eu troco.
- **A app passa a viver no Render**, não no teu PC. O `Gather.bat` continua a funcionar
  para uso local, mas já não é necessário.

## Vantagem em relação ao túnel

O endereço é **fixo** — não muda nunca. Podes mandar o link à equipa e guardá-lo.
