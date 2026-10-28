# StartNow

> Antes se chamava "Começa Já". Quem já tinha tarefas guardadas no aparelho não perde nada: os dados são trazidos para o nome novo na primeira abertura.

App contra a procrastinação: uma **lista do dia** e um **cronômetro de 5 minutos** ("Começar agora").
A ideia é simples: você não precisa terminar a tarefa, só ficar 5 minutos nela. Quase sempre dá para continuar.

## O que faz
- **Lista de hoje:** escreva a tarefa, aperte Enter, toque no círculo para marcar como feita. As feitas descem para o fim.
- **Começar agora:** o botão grande pega a primeira tarefa pendente e abre um cronômetro de 5 minutos (ou use o ▶ de uma tarefa específica).
  No fim toca um som, vibra e pergunta: *terminei*, *mais 5 minutos* ou *parar por agora*. O cronômetro continua certo mesmo se a tela travar ou o app for fechado.
- **Tarefas de ontem:** o que ficou sem fazer aparece num aviso com *Trazer para hoje* ou *Dispensar*.
- **Sequência:** dias seguidos com **pelo menos uma** tarefa feita. A sequência só quebra quando o dia termina sem nenhuma.
- **Desfazer:** apagou sem querer? O aviso tem o botão *Desfazer*.
- **Personalizar (ícone de paleta no topo):**
  - **Tema:** escuro, claro ou automático (segue o aparelho).
  - **Cor de destaque:** 8 cores prontas, um seletor livre e um campo para digitar o código (`#rrggbb`). A mudança vale na hora e fica guardada no aparelho.
  - O app calcula sozinho as variações da cor e escolhe texto branco ou escuro em cima dela, para sempre dar para ler (até com amarelo). **Restaurar padrão** volta ao azul escuro.
- **Instalável no celular** e funciona sem internet.

## Como abrir
Precisa de um servidor local qualquer (o app instalável não funciona abrindo o arquivo direto):

```bash
cd StartNow
python3 -m http.server 8080      # ou: npx serve
```
Abra `http://localhost:8080`. No celular, abra o endereço do computador na mesma rede e use *Adicionar à tela inicial*.

## Testes
```bash
node --test test/
```
Testam a lógica (`js/logica.js`: datas, sequência, ordenação, tarefas de ontem, tempo) e as contas de cor (`js/tema.js`: códigos de cor, contraste legível em todas as cores e nos dois temas).

## Como o código está organizado
```
index.html           a tela única ("Hoje")
css/                 base.css (cores), componentes.css (botões, campos), hoje.css (tela e cronômetro)
js/config.js         nome do app e ajustes (minutos do foco, tamanho máximo da tarefa)
js/logica.js         as regras (sem tela; é o que os testes cobrem)
js/tema.js           cores e tema: guarda a escolha, calcula as variações e o contraste (roda no <head>)
js/personalizar.js   o painel "Personalizar"
js/utilitarios.js    escapar texto, data por extenso, ícones, aviso rápido
js/armazenamento.js  onde os dados ficam (hoje: no aparelho). Trocar por nuvem mexe só aqui
js/foco.js           o cronômetro "Começar agora"
js/hoje.js           a tela principal
manifest.json, service-worker.js, js/pwa.js, icones/   instalar no celular e abrir sem internet
```
Ao mudar qualquer arquivo listado em `service-worker.js`, aumente `VERSAO_CACHE`.

## Próximos passos (ideias)
1. Login e sincronização entre aparelhos (Supabase, como no Manager Transportes).
2. Lembrete diário no celular ("Qual é a sua primeira tarefa de hoje?").
3. Tarefas que se repetem (rotina), e histórico dos dias.
4. Publicar na Vercel.
