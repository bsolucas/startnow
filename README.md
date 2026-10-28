# StartNow

> Antes se chamava "Começa Já". Quem já tinha tarefas guardadas no aparelho não perde nada: os dados são trazidos para o nome novo na primeira abertura.

App contra a procrastinação: uma **lista do dia** e um **cronômetro de 5 minutos** ("Começar agora").
A ideia é simples: você não precisa terminar a tarefa, só ficar 5 minutos nela. Quase sempre dá para continuar.

## O que faz
- **Oi, digite seu nome:** na primeira tela você digita o seu nome. Ele é o seu **login e a sua senha** neste aparelho: na próxima vez é só digitá-lo de novo (ou deixar marcado *Continuar conectado*, que entra direto). "Maria" e "maria" são a mesma pessoa; um nome novo cria uma pessoa nova.
- **Criar lista de tarefas:** a pessoa nova passa por uma tela para montar a lista. Para cada tarefa você escolhe **em que dia** (hoje, amanhã... até 7 dias) e se ela **se repete**: só naquele dia, **toda semana** (ex.: toda terça) ou **todo dia**.
- **Categorias (subcategorias):** organize as tarefas por área da vida. Já vêm prontas **Trabalho, Casa, Estudos, Tempo livre, Compromissos e Lista de supermercado**, e você cria, renomeia, troca a cor e apaga as suas pelo botão **Categorias** (apagar uma categoria não apaga as tarefas: elas ficam "sem categoria"). Cada tarefa tem uma categoria opcional.
- **Horário de cada tarefa:** em "Categoria, horário e repetição" você marca **das 09:00 até 10:30** (o fim é opcional). A lista fica em ordem de horário, a linha mostra o horário e a duração ("09:00–10:30 · 1h30"), e o app **avisa** se o horário bate com outra tarefa do mesmo dia (sem impedir de salvar). Valem para tarefas únicas e para as que se repetem.
- **Duas formas de ver a lista:** **Por tipo** (tarefas de hoje, diárias e concluídas) ou **Por categoria** (uma seção para cada categoria, com tudo dela, como numa lista de supermercado, mostrando quantas já foram feitas). A escolha fica guardada.
- **Faixa da semana:** os próximos 7 dias no topo. Toque num dia para ver e planejar as tarefas dele. Um pontinho mostra se o dia tem tarefas (azul) ou se está tudo feito (verde).
- **Tarefas separadas em grupos:** *Tarefas de hoje* (ou *para quarta*, etc.), *Tarefas diárias* (as que se repetem) e *Concluídas*.
- **Cronômetro da tarefa ("Começar agora"):** o botão grande pega a primeira tarefa pendente de hoje (ou use o ▶ de uma tarefa específica). O **tempo vem da própria tarefa**: se ela tem horário (das 09:00 às 10:30), o cronômetro conta **1h30**; se não tem, conta **5 minutos** (o truque contra a procrastinação: só ficar um pouco nela). Dá para **pausar e retomar**. Quando o tempo acaba, toca um som, vibra e pergunta: *terminei*, *mais 5 minutos* ou *parar por agora*. O cronômetro continua certo mesmo se a tela travar ou o app for fechado, e em pausa ele guarda quanto faltava.
- **Editar uma tarefa:** toque no nome dela na lista para mudar o **horário** (ou tirar o horário), o texto e a categoria. Se ela se repete, a folha avisa que a mudança vale para todos os dias dela. Se o novo horário bate com outra tarefa, o app avisa.
- **Tarefas de ontem:** o que ficou sem fazer aparece num aviso com *Trazer para hoje* ou *Dispensar*. As tarefas que se repetem não acumulam.
- **Sequência:** dias seguidos com **pelo menos uma** tarefa feita (única ou diária). Só quebra quando o dia termina sem nenhuma.
- **Desfazer:** apagou sem querer? O aviso tem o botão *Desfazer*. Apagar uma tarefa que se repete pede confirmação, porque ela some de todos os dias.
- **Personalizar (ícone de paleta no topo):**
  - **Tema:** escuro, claro ou automático (segue o aparelho).
  - **Cor de destaque:** 8 cores prontas, um seletor livre e um campo para digitar o código (`#rrggbb`). Vale na hora e fica guardado.
  - O app calcula sozinho as variações da cor e escolhe texto branco ou escuro em cima dela, para sempre dar para ler. **Restaurar padrão** volta ao azul escuro.
- **Instalável no celular** e funciona sem internet.

## Precisa de banco de dados?
**Para uma pessoa só, em período de teste: não.** Tudo fica guardado no próprio navegador do aparelho (`localStorage`), sem servidor e sem internet.
O que isso significa na prática:
- Os dados são **daquele aparelho e daquele navegador**. Em outro celular (ou outro navegador) a lista começa vazia.
- Se a pessoa **limpar os dados do navegador** ou desinstalar o app, as tarefas se perdem.
- Não existe segurança de verdade: **nome = login = senha** só identifica quem está usando; quem pegar o aparelho aberto, ou souber o nome, entra.

**Quando passa a precisar de banco (Supabase):** usar em mais de um aparelho, ter backup, ter mais de uma pessoa de verdade com senha, ou mandar lembretes. A troca é feita só em `js/armazenamento.js`; o resto do app não muda.

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
Testam a lógica (`js/logica.js`: datas, dias da semana, tarefas que se repetem, categorias, horários, duração, edição e conflitos, sequência, nome como login, tempo) e as contas de cor (`js/tema.js`: códigos de cor, contraste legível em todas as cores e nos dois temas).

## Como o código está organizado
```
index.html           a tela única ("Hoje")
css/                 base.css (cores), componentes.css (botões, campos), hoje.css (tela e cronômetro)
js/config.js         nome do app e ajustes (minutos do foco, tamanho máximo da tarefa)
js/logica.js         as regras (sem tela; é o que os testes cobrem)
js/tema.js           cores e tema: guarda a escolha, calcula as variações e o contraste (roda no <head>)
js/personalizar.js   o painel "Personalizar"
js/utilitarios.js    escapar texto, data por extenso, ícones, aviso rápido
js/armazenamento.js  onde os dados ficam, uma gaveta por pessoa (hoje: no aparelho). Trocar por nuvem mexe só aqui
js/perfil.js         "Oi, digite seu nome" e "Criar lista de tarefas"
js/formulario.js     o formulário de nova tarefa (dia, categoria, horário e repetir)
js/categorias.js     o painel de categorias
js/iniciar.js        decide o que mostrar ao abrir
js/foco.js           o cronômetro da tarefa (tempo da tarefa, pausar e retomar)
js/editar.js         a folha de editar uma tarefa
js/hoje.js           a tela principal
manifest.json, service-worker.js, js/pwa.js, icones/   instalar no celular e abrir sem internet
```
Ao mudar qualquer arquivo listado em `service-worker.js`, aumente `VERSAO_CACHE`.

## Próximos passos (ideias)
1. Login de verdade e sincronização entre aparelhos (Supabase, como no Manager Transportes).
2. Lembrete diário no celular ("Qual é a sua primeira tarefa de hoje?").
3. Tarefas que se repetem (rotina), e histórico dos dias.
4. Publicar na Vercel.
