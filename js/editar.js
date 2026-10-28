/* =============================================================================
   editar.js — EDITAR UMA TAREFA (tocar nela na lista)
   -----------------------------------------------------------------------------
   Abre uma folha com o texto, a categoria e o horário (das HH:MM até HH:MM). Serve para mudar o horário
   de uma tarefa, tirar o horário, ou só renomear. Se a tarefa se repete (diária/semanal), a mudança vale
   para todos os dias em que ela aparece (a folha avisa).
   Uso:  App.editar.abrir(item, dados, aoSalvar)   // aoSalvar(item) depois de gravar
   ============================================================================= */
App.editar = (function () {
  var L = App.logica, u = App.utils, painel = document.getElementById("painel-editar");
  var dados = null, item = null, aoSalvar = null, anterior = null, categoriaId = null;

  function chips() {
    return '<button type="button" class="chip" data-cat="" aria-pressed="' + (!categoriaId) + '">Sem categoria</button>' +
      dados.categorias.map(function (c) {
        return '<button type="button" class="chip chip-cat" style="--cat:' + c.cor + '" data-cat="' + u.escaparHtml(c.id) + '" aria-pressed="' + (c.id === categoriaId) + '"><i></i>' + u.escaparHtml(c.nome) + "</button>";
      }).join("");
  }

  function abrir(it, d, depois) {
    item = it; dados = d; aoSalvar = depois; anterior = document.activeElement; categoriaId = it.categoriaId || null;
    painel.innerHTML =
      '<div class="painel-fundo" data-fechar></div>' +
      '<form class="painel-folha" id="ed-form" role="dialog" aria-modal="true" aria-labelledby="ed-titulo" autocomplete="off">' +
        '<div class="painel-topo"><h2 id="ed-titulo">Editar tarefa</h2><button type="button" class="botao-icone" data-fechar aria-label="Fechar">' + App.icone("x") + "</button></div>" +
        (it.tipo === "rotina" ? '<p class="aviso-rotina">' + App.icone("repetir") + " Esta tarefa se repete (" + u.escaparHtml(it.repete) + "). O que você mudar vale para todos os dias dela.</p>" : "") +
        '<p class="chips-rotulo">Tarefa</p><input class="campo" id="ed-texto" maxlength="140" value="' + u.escaparHtml(it.texto) + '" aria-label="Texto da tarefa" />' +
        '<p class="chips-rotulo">Horário</p><div class="horarios">' +
          '<label>Das<input class="campo campo-hora" type="time" id="ed-inicio" value="' + (it.inicio || "") + '" aria-label="Horário de início"></label>' +
          '<label>até<input class="campo campo-hora" type="time" id="ed-fim" value="' + (it.fim || "") + '" aria-label="Horário de fim"></label>' +
          '<button type="button" class="botao-icone" data-limpar aria-label="Tirar o horário" title="Tirar o horário">' + App.icone("x") + "</button></div>" +
        '<p class="chips-rotulo">Categoria</p><div class="chips" id="ed-cats" role="group" aria-label="Categoria">' + chips() + "</div>" +
        '<p class="erro" id="ed-erro" role="alert"></p>' +
        '<div class="painel-acoes"><button type="button" class="botao botao-borda" data-fechar>Cancelar</button><button type="submit" class="botao botao-primario">Salvar</button></div>' +
      "</form>";
    painel.hidden = false; document.body.style.overflow = "hidden";
    var campo = painel.querySelector(it.inicio || it.fim ? "#ed-texto" : "#ed-inicio");
    campo.focus();
  }
  function fechar() {
    painel.hidden = true; painel.innerHTML = ""; document.body.style.overflow = "";
    if (anterior && anterior.focus) anterior.focus();
  }

  painel.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-fechar]")) return fechar();
    var c = ev.target.closest("[data-cat]");
    if (c) { categoriaId = c.getAttribute("data-cat") || null; painel.querySelector("#ed-cats").innerHTML = chips(); }
    else if (ev.target.closest("[data-limpar]")) { painel.querySelector("#ed-inicio").value = ""; painel.querySelector("#ed-fim").value = ""; }
  });
  painel.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var r = L.editarItem(dados, item.chave, {
      texto: painel.querySelector("#ed-texto").value, categoriaId: categoriaId,
      inicio: painel.querySelector("#ed-inicio").value, fim: painel.querySelector("#ed-fim").value
    }, App.config.MAX_TEXTO_TAREFA);
    if (!r.ok) { painel.querySelector("#ed-erro").textContent = r.erro; return; }
    var feito = item; fechar(); aoSalvar(feito);
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !painel.hidden) fechar(); });

  return { abrir: abrir };
})();
