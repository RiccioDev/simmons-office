# Guardar e voltar a uma versão do código

Cada alteração que eu faço no escritório passa a ter **três cópias**, por esta ordem de
confiança:

## 1. Git (a principal)

Cada alteração é um commit. O histórico completo está aqui:

```
git log --oneline
```

Para veres tudo o que mudou num dia:

```
git log --since="2026-11-05" --oneline
```

**Voltar a qualquer versão anterior:**

```
git log --oneline                    (escolhe o código do commit)
git revert <codigo>                  (desfaz essa alteração, mantendo o histórico)
git push
```

O Render atualiza sozinho em 2–3 minutos.

## 2. Pasta `versoes/` (cópia à mão, nesta máquina)

Cada vez que dou uma versão por boa, corro o **`guardar-versao.bat`**, que copia os
ficheiros para `versoes/simmons-office_AAAA-MM-DD_HH-MM/`.

Ficam as **20 mais recentes**. Cada pasta tem um `LEIA-ME.txt`.

**Voltar atrás sem git:** copiar os ficheiros da pasta da versão boa por cima dos
originais, e correr `git add -A`, `git commit`, `git push`.

## 3. GitHub

Uma cópia fora deste computador. Mesmo que apagues tudo aqui, o código está lá:
<https://github.com/RiccioDev/simmons-office>

## Os dados (mesas e contas)

Estes **não** estão no código. Ficam em:

- **Postgres do Render** — mesas, donos, contas
- **`backups/`** — cópia diária às 19:00, guarda 30 dias

Restaurei-los é independente do código: voltar a uma versão antiga do código não mexe
nos dados.

## Quando é que eu guardo uma versão

1. Depois de uma alteração testada e confirmada a funcionar
2. **Antes** de uma alteração grande (para haver para onde voltar)
3. Quando tu pedires

## Regra que ficou

Uma alteração nunca é publicada sem antes: correr o código localmente, abrir num browser
de teste, confirmar que as mesas desenham e que não há erros no chat — e só então fazer
push. Foi por não ter feito isto que o escritório ficou com o mapa em branco.
