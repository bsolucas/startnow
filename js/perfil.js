/* =============================================================================
   perfil.js — "OI, DIGITE SEU NOME" E "CRIAR LISTA DE TAREFAS"
   -----------------------------------------------------------------------------
   O nome é o login E a senha: quem digita o nome certo entra no seu espaço; um nome novo cria uma pessoa nova.
   AVISO HONESTO: isso identifica quem está usando, mas NÃO protege nada. Os dados ficam no aparelho e quem
   pega o aparelho aberto, ou sabe o nome, entra. Serve para o período de testes com uma pessoa só.
   Fluxo:  abrir o app -> (se não está conectado) "Oi! Digite seu nome" -> (se é novo) "Criar lista de tarefas" -> tela principal.
   ============================================================================= */
App.perfil = (function () {
  var L = App.logica, u = App.utils, A = App.armazenamento, cfg = App.config;
  var entrada = document.getElementById("entrada"), criarLista = document.getElementById("criar-lista");
  var aoPronto = function () {};

  function esconderTudo() { entrada.hidden = true; criarLista.hidden = true; document.getElementById("app").hidden = true; }

  /* ---------- 1. Oi, digite seu nome ---------- */
  function mostrarEntrada(msg) {
    esconderTudo();
    entrada.hidden = false;
    entrada.innerHTML =
      '<div class="tela-caixa"><div class="marca marca-grande"><span class="marca-icone">S</span><span>' + u.escaparHtml(cfg.NOME_APP) + "</span></div>" +
        '<h1 class="tela-titulo">Oi! Digite seu nome</h1>' +
        '<p class="tela-texto">Seu nome é o seu acesso. Na próxima vez, é só digitá-lo de novo.</p>' +
        '<form id="form-nome" autocomplete="off"><input class="campo campo-grande" id="campo-nome" maxlength="30" placeholder="Seu nome" aria-label="Seu nome" autocapitalize="words" enterkeyhint="go" />' +
          '<label class="marcador"><input type="checkbox" id="lembrar" checked /> Continuar conectado neste aparelho</label>' +
          '<p class="erro" id="erro-nome" role="alert">' + u.escaparHtml(msg || "") + "</p>" +
          '<button class="botao botao-primario botao-grande botao-largo" type="submit">Continuar</button></form>' +
        '<p class="tela-nota">Só para testes: o nome é login e senha ao mesmo tempo, e fica guardado neste aparelho.</p></div>';
    var campo = document.getElementById("campo-nome");
    campo.focus();
    document.getElementById("form-nome").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nome = L.nomeLimpo(campo.value);
      if (!nome) { document.getElementById("erro-nome").textContent = "Digite o seu nome para continuar."; campo.focus(); return; }
      var lembrar = document.getElementById("lembrar").checked, existente = A.achar(nome), novo = !existente;
      var perfil = existente || A.criar(nome);
      A.entrar(perfil.chave, lembrar);
      // pessoa nova (ou que ainda não criou nenhuma tarefa) passa pela criação da lista
      var d = A.ler();
      aoPronto(novo || (!d.tarefas.length && !d.rotinas.length));
    });
  }

  /* ---------- 2. Criar lista de tarefas ---------- */
  function mostrarCriarLista(aoConcluir) {
    esconderTudo();
    criarLista.hidden = false;
    var dados = A.ler(), hoje = L.diaDe(new Date());
    criarLista.innerHTML =
      '<div class="tela-caixa tela-larga"><p class="tela-passo">Oi, ' + u.escaparHtml(A.atual().nome) + "!</p>" +
        '<h1 class="tela-titulo">Criar lista de tarefas</h1>' +
        '<p class="tela-texto">Escreva o que você quer fazer. Escolha o dia e se a tarefa se repete: só naquele dia, toda semana ou todo dia. Pequena já serve.</p>' +
        '<div id="formulario-criar"></div><ul class="previa-lista" id="previa-lista" aria-live="polite"></ul>' +
        '<button class="botao botao-primario botao-grande botao-largo" id="botao-pronto" type="button">Pular por agora</button></div>';
    var previa = document.getElementById("previa-lista"), botao = document.getElementById("botao-pronto");
    function desenharPrevia() {
      var itens = [];
      function detalhe(t, quando) {
        var c = dados.categorias.filter(function (x) { return x.id === t.categoriaId; })[0], h = L.rotuloHorario(t.inicio, t.fim);
        return [quando, c ? c.nome : "", h].filter(Boolean).join(" · ");
      }
      dados.rotinas.forEach(function (r) { itens.push({ texto: r.texto, quando: detalhe(r, L.rotuloRepete(r)) }); });
      dados.tarefas.forEach(function (t) { itens.push({ texto: t.texto, quando: detalhe(t, L.nomeDoDia(t.dia, hoje)) }); });
      previa.innerHTML = itens.map(function (i) { return "<li>" + App.icone("check") + "<span>" + u.escaparHtml(i.texto) + '</span><small>' + u.escaparHtml(i.quando) + "</small></li>"; }).join("");
      botao.textContent = itens.length ? "Pronto, ver minha lista" : "Pular por agora";
    }
    App.formulario.criar(document.getElementById("formulario-criar"), {
      hoje: hoje, diaInicial: hoje, mostrarDias: true, abrirOpcoes: true,
      categorias: function () { return dados.categorias; },
      aoAdicionar: function (def) { var r = aoAdicionarTarefa(dados, def, hoje); if (r.ok) { A.gravar(dados); desenharPrevia(); } return r; }
    });
    botao.addEventListener("click", aoConcluir);
    desenharPrevia();
  }

  /* Cria a tarefa (única ou rotina) a partir do formulário. Devolve { ok: true, aviso? } ou { ok: false, erro }.
     O aviso aparece quando o horário bate com outra tarefa do mesmo dia (não impede de salvar). Usado aqui e na tela principal. */
  function aoAdicionarTarefa(dados, def, hoje) {
    var h = L.validarHorario(def.inicio, def.fim);
    if (!h.ok) return { ok: false, erro: h.erro };
    var extra = { categoriaId: def.categoriaId || null, inicio: h.inicio, fim: h.fim };
    var agora = Date.now(), desde = def.dia < hoje ? hoje : def.dia, item;
    if (def.repete === "diaria") item = L.novaRotina(def.texto, "diaria", [], desde, agora, cfg.MAX_TEXTO_TAREFA, extra);
    else if (def.repete === "semanal") item = L.novaRotina(def.texto, "semanal", [L.diaSemana(def.dia)], desde, agora, cfg.MAX_TEXTO_TAREFA, extra);
    else item = L.novaTarefa(def.texto, def.dia, agora, cfg.MAX_TEXTO_TAREFA, extra);
    if (!item) return { ok: false, erro: "Escreva a tarefa primeiro." };
    var ehRotina = item.id.charAt(0) === "r";
    (ehRotina ? dados.rotinas : dados.tarefas).push(item);
    var aviso = null;
    if (h.inicio && h.fim) {
      var minha = ehRotina ? "r:" + item.id : item.id;
      var batem = L.conflitos(L.itensDoDia(dados, desde).todos.filter(function (i) { return i.chave !== minha; }), h.inicio, h.fim);
      if (batem.length) aviso = "Atenção: esse horário bate com “" + batem[0].texto + "” (" + L.rotuloHorario(batem[0].inicio, batem[0].fim) + ").";
    }
    return { ok: true, aviso: aviso };
  }

  /* Liga o módulo. aoEntrar(precisaCriarLista) é chamado quando há uma pessoa conectada. */
  function iniciar(aoEntrar) {
    aoPronto = aoEntrar;
    var salva = A.sessaoSalva();
    if (salva && A.entrar(salva.chave, true)) return aoEntrar(false);
    mostrarEntrada();
  }
  function sair() { App.foco.limpar(); A.sair(); mostrarEntrada(); }

  return { iniciar: iniciar, sair: sair, mostrarCriarLista: mostrarCriarLista, adicionarTarefa: aoAdicionarTarefa };
})();
