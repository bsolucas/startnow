/* =============================================================================
   categorias.js — PAINEL "CATEGORIAS" (criar, renomear, mudar a cor e apagar)
   -----------------------------------------------------------------------------
   As categorias (subcategorias) são da pessoa: Trabalho, Casa, Estudos, Tempo livre, Compromissos e
   Lista de supermercado já vêm prontas, mas ela pode mudar tudo. Apagar uma categoria NÃO apaga as tarefas:
   elas ficam "sem categoria". Cada mudança é salva na hora.
   Uso:  App.categorias.abrir(dados, salvar, aoMudar)
   ============================================================================= */
App.categorias = (function () {
  var L = App.logica, u = App.utils, painel = document.getElementById("painel-categorias");
  var dados = null, salvar = null, aoMudar = null, anterior = null;

  function mudou() { salvar(); aoMudar(); desenharLista(); }

  function quantas(id) {
    return dados.tarefas.concat(dados.rotinas).filter(function (t) { return t.categoriaId === id; }).length;
  }

  function desenharLista() {
    var ul = painel.querySelector("#cat-lista");
    ul.innerHTML = dados.categorias.map(function (c) {
      var n = quantas(c.id);
      return '<li class="cat-linha" data-id="' + u.escaparHtml(c.id) + '" style="--cat:' + c.cor + '">' +
        '<button type="button" class="cat-cor" data-acao="cor" aria-label="Mudar a cor de ' + u.escaparHtml(c.nome) + '" title="Mudar a cor"></button>' +
        '<input class="campo" maxlength="24" value="' + u.escaparHtml(c.nome) + '" aria-label="Nome da categoria" data-acao="nome" />' +
        '<span class="cat-qtd" title="Tarefas nesta categoria">' + n + "</span>" +
        '<button type="button" class="botao-icone" data-acao="apagar" aria-label="Apagar ' + u.escaparHtml(c.nome) + '" title="Apagar">' + App.icone("x") + "</button></li>";
    }).join("") || '<li class="texto-suave cat-vazio">Nenhuma categoria. Crie a primeira abaixo.</li>';
    painel.querySelector("#cat-novo").disabled = dados.categorias.length >= L.MAX_CATEGORIAS;
  }

  function abrir(d, aoSalvar, aoAlterar) {
    dados = d; salvar = aoSalvar; aoMudar = aoAlterar; anterior = document.activeElement;
    painel.innerHTML =
      '<div class="painel-fundo" data-fechar></div>' +
      '<div class="painel-folha" role="dialog" aria-modal="true" aria-labelledby="cat-titulo">' +
        '<div class="painel-topo"><h2 id="cat-titulo">Categorias</h2><button type="button" class="botao-icone" data-fechar aria-label="Fechar">' + App.icone("x") + "</button></div>" +
        '<p class="tela-texto-esq">Organize as tarefas por área da vida. Toque na bolinha para trocar a cor e no nome para renomear. Apagar uma categoria não apaga as tarefas dela.</p>' +
        '<ul class="cat-lista" id="cat-lista"></ul>' +
        '<form class="cat-nova" id="cat-form" autocomplete="off"><input class="campo" id="cat-novo" maxlength="24" placeholder="Nova categoria (ex.: Saúde)" aria-label="Nova categoria" />' +
          '<button class="botao botao-primario" type="submit">Criar</button></form>' +
        '<p class="erro" id="cat-erro" role="alert"></p>' +
        '<div class="painel-acoes um"><button type="button" class="botao botao-primario" data-fechar>Pronto</button></div>' +
      "</div>";
    painel.hidden = false; document.body.style.overflow = "hidden";
    desenharLista();
    painel.querySelector("[data-fechar][aria-label]").focus();
  }
  function fechar() {
    painel.hidden = true; painel.innerHTML = ""; document.body.style.overflow = "";
    if (anterior && anterior.focus) anterior.focus();
  }

  painel.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-fechar]")) return fechar();
    var b = ev.target.closest("[data-acao]"), li = ev.target.closest("[data-id]");
    if (!b || !li) return;
    var cat = dados.categorias.filter(function (c) { return c.id === li.getAttribute("data-id"); })[0];
    if (!cat) return;
    if (b.getAttribute("data-acao") === "cor") {
      var i = L.CORES_CATEGORIA.indexOf(cat.cor);
      cat.cor = L.CORES_CATEGORIA[(i + 1) % L.CORES_CATEGORIA.length]; mudou();
    } else if (b.getAttribute("data-acao") === "apagar") {
      var n = quantas(cat.id);
      if (!window.confirm("Apagar a categoria \"" + cat.nome + "\"?" + (n ? " As " + n + " tarefa(s) dela continuam, só ficam sem categoria." : ""))) return;
      L.removerCategoria(dados, cat.id); mudou();
    }
  });
  /* renomear: vale ao sair do campo ou apertar Enter */
  painel.addEventListener("change", function (ev) {
    if (ev.target.getAttribute("data-acao") !== "nome") return;
    var li = ev.target.closest("[data-id]"), cat = dados.categorias.filter(function (c) { return c.id === li.getAttribute("data-id"); })[0];
    var nome = L.nomeLimpo(ev.target.value).slice(0, 24), erro = painel.querySelector("#cat-erro");
    var repetido = dados.categorias.some(function (c) { return c.id !== cat.id && L.normalizarNome(c.nome) === L.normalizarNome(nome); });
    if (!nome) { erro.textContent = "O nome não pode ficar vazio."; ev.target.value = cat.nome; return; }
    if (repetido) { erro.textContent = "Já existe uma categoria com esse nome."; ev.target.value = cat.nome; return; }
    erro.textContent = ""; cat.nome = nome; mudou();
  });
  painel.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var campo = painel.querySelector("#cat-novo"), erro = painel.querySelector("#cat-erro");
    if (dados.categorias.length >= L.MAX_CATEGORIAS) { erro.textContent = "Máximo de " + L.MAX_CATEGORIAS + " categorias."; return; }
    var c = L.novaCategoria(campo.value, null, dados.categorias, Date.now());
    if (!c) { erro.textContent = L.nomeLimpo(campo.value) ? "Já existe uma categoria com esse nome." : "Escreva o nome da categoria."; campo.focus(); return; }
    erro.textContent = ""; dados.categorias.push(c); campo.value = ""; mudou(); campo.focus();
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !painel.hidden) fechar(); });

  return { abrir: abrir };
})();
