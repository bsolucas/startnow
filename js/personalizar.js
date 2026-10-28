/* =============================================================================
   personalizar.js — PAINEL "PERSONALIZAR" (tema e cor de destaque)
   -----------------------------------------------------------------------------
   Abre pelo botão da paleta no topo. Cada mudança vale na hora e fica guardada no aparelho.
     • Tema: escuro, claro ou automático (segue o aparelho).
     • Cor de destaque: 8 cores prontas, um seletor de cor livre e um campo para digitar o código (#rrggbb).
   As contas de cor (contraste, variações) ficam em js/tema.js.
   ============================================================================= */
(function () {
  var T = App.tema, u = App.utils, painel = document.getElementById("painel"), botao = document.getElementById("botao-personalizar");
  var prefs = T.ler(), anterior = null;

  botao.innerHTML = App.icone("paleta");

  function mudar(novo) {
    for (var k in novo) prefs[k] = novo[k];
    T.gravar(prefs); T.aplicar(prefs); marcar();
  }

  /* Atualiza o que está "marcado" no painel, sem redesenhar tudo (para não perder o foco ao digitar). */
  function marcar() {
    [].forEach.call(painel.querySelectorAll("[data-opcao-tema]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-opcao-tema") === prefs.tema)); });
    [].forEach.call(painel.querySelectorAll("[data-opcao-cor]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-opcao-cor") === prefs.cor)); });
    var seletor = painel.querySelector("#pc-cor"), hex = painel.querySelector("#pc-hex");
    if (seletor) seletor.value = prefs.cor;
    if (hex && document.activeElement !== hex) { hex.value = prefs.cor; hex.classList.remove("invalido"); }
  }

  function montar() {
    var temas = [["escuro", "Escuro"], ["claro", "Claro"], ["auto", "Automático"]];
    painel.innerHTML =
      '<div class="painel-fundo" data-fechar></div>' +
      '<div class="painel-folha" role="dialog" aria-modal="true" aria-labelledby="pc-titulo">' +
        '<div class="painel-topo"><h2 id="pc-titulo">Personalizar</h2>' +
          '<button type="button" class="botao-icone" data-fechar aria-label="Fechar">' + App.icone("x") + "</button></div>" +

        '<p class="painel-rotulo">Tema</p>' +
        '<div class="segmentos" role="group" aria-label="Tema">' + temas.map(function (t) {
          return '<button type="button" data-opcao-tema="' + t[0] + '" aria-pressed="false">' + t[1] + "</button>"; }).join("") + "</div>" +

        '<p class="painel-rotulo">Cor de destaque</p>' +
        '<div class="amostras" role="group" aria-label="Cores prontas">' + T.PRESETS.map(function (c) {
          return '<button type="button" class="amostra" data-opcao-cor="' + c.cor + '" style="--amostra:' + c.cor + '" aria-pressed="false" aria-label="' + u.escaparHtml(c.nome) + '" title="' + u.escaparHtml(c.nome) + '">' + App.icone("check") + "</button>"; }).join("") + "</div>" +

        '<div class="cor-propria">' +
          '<label class="cor-seletor" title="Escolher outra cor"><input type="color" id="pc-cor" aria-label="Escolher outra cor"><span>Outra cor</span></label>' +
          '<input class="campo" id="pc-hex" maxlength="7" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="#3b6fd6" aria-label="Código da cor (#rrggbb)">' +
        "</div>" +

        '<p class="painel-rotulo">Como fica</p>' +
        '<div class="previa-cores"><button type="button" class="botao botao-primario" tabindex="-1">Começar agora</button>' +
          '<span class="previa-pct">40%</span><div class="barra" aria-hidden="true"><i style="width:40%"></i></div></div>' +

        '<div class="painel-acoes"><button type="button" class="botao botao-borda" data-restaurar>Restaurar padrão</button>' +
          '<button type="button" class="botao botao-primario" data-fechar>Pronto</button></div>' +
      "</div>";
    marcar();
  }

  function abrir() {
    anterior = document.activeElement;
    montar(); painel.hidden = false; document.body.style.overflow = "hidden";
    painel.querySelector("[data-fechar][aria-label]").focus();
  }
  function fechar() {
    painel.hidden = true; painel.innerHTML = ""; document.body.style.overflow = "";
    if (anterior && anterior.focus) anterior.focus();
  }

  botao.addEventListener("click", abrir);
  painel.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-fechar]")) return fechar();
    var t = ev.target.closest("[data-opcao-tema]"), c = ev.target.closest("[data-opcao-cor]");
    if (t) mudar({ tema: t.getAttribute("data-opcao-tema") });
    else if (c) mudar({ cor: c.getAttribute("data-opcao-cor") });
    else if (ev.target.closest("[data-restaurar]")) { mudar({ cor: T.PADRAO.cor, tema: T.PADRAO.tema }); App.aviso("Cores restauradas."); }
  });
  // o seletor livre dispara "input" enquanto se arrasta: a cor muda ao vivo
  painel.addEventListener("input", function (ev) {
    if (ev.target.id === "pc-cor") mudar({ cor: T.normalizarHex(ev.target.value) || prefs.cor });
    else if (ev.target.id === "pc-hex") {
      var h = T.normalizarHex(ev.target.value);
      ev.target.classList.toggle("invalido", !h && ev.target.value.trim() !== "");
      if (h && /^#?[0-9a-f]{6}$/i.test(ev.target.value.trim())) mudar({ cor: h });   // só aplica quando o código está completo
    }
  });
  painel.addEventListener("focusout", function (ev) { if (ev.target.id === "pc-hex") { ev.target.classList.remove("invalido"); ev.target.value = prefs.cor; } });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !painel.hidden) fechar(); });
})();
