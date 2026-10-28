/* =============================================================================
   formulario.js — FORMULÁRIO "NOVA TAREFA" (usado na tela principal e na criação da lista)
   -----------------------------------------------------------------------------
   Campo de texto + uma área "Categoria, horário e repetição":
     • Categoria: Trabalho, Casa, Estudos... (as da pessoa; ou "Sem categoria");
     • Horário (opcional): "das 09:00 até 10:30";
     • Repetir: só naquele dia, toda semana naquele dia da semana, ou todo dia.
   Na criação da lista (mostrarDias) também escolhe qual dia; na tela principal o dia vem da faixa da semana.
   Uso:  var f = App.formulario.criar(elemento, { hoje, diaInicial, mostrarDias, abrirOpcoes, categorias(), aoAdicionar(def) });
         def = { texto, dia, repete: "nenhuma"|"semanal"|"diaria", categoriaId, inicio, fim }
         aoAdicionar devolve { ok: true, aviso? } ou { ok: false, erro } (o erro aparece embaixo do formulário).
   ============================================================================= */
App.formulario = (function () {
  var L = App.logica, u = App.utils;

  function criar(el, op) {
    var dia = op.diaInicial || op.hoje, repete = "nenhuma", categoriaId = null, inicio = "", fim = "", erro = "", aberto = !!op.abrirOpcoes, campo;
    var proximos = L.proximosDias(op.hoje, 7);

    function categorias() { return (op.categorias && op.categorias()) || []; }
    function nomeCurto(d) { return d === op.hoje ? "hoje" : d === L.somarDias(op.hoje, 1) ? "amanhã" : L.DIAS_LONGOS[L.diaSemana(d)]; }

    function resumo() {
      var cat = categorias().filter(function (c) { return c.id === categoriaId; })[0];
      var hora = L.rotuloHorario(inicio, fim || null);
      var rep = repete === "diaria" ? "todo dia" : repete === "semanal" ? "toda " + L.DIAS_LONGOS[L.diaSemana(dia)] : "só " + (dia === op.hoje ? "hoje" : "em " + nomeCurto(dia));
      return (cat ? cat.nome : "Sem categoria") + " · " + (hora || "sem horário") + " · " + rep;
    }

    function desenhar() {
      var valor = campo ? campo.value : "", tinhaFoco = campo && document.activeElement === campo;
      var cats = categorias();
      if (categoriaId && !cats.some(function (c) { return c.id === categoriaId; })) categoriaId = null;   // a categoria foi apagada
      var semana = L.DIAS_LONGOS[L.diaSemana(dia)];
      var opcoesRepete = [["nenhuma", "Só " + (dia === op.hoje ? "hoje" : "em " + nomeCurto(dia))], ["semanal", "Toda " + semana], ["diaria", "Todo dia"]];
      el.innerHTML =
        '<form class="form-tarefa" autocomplete="off">' +
          '<div class="nova-tarefa"><input class="campo" maxlength="140" placeholder="O que fazer?" aria-label="Nova tarefa" enterkeyhint="done" />' +
          '<button class="botao botao-primario" type="submit">Adicionar</button></div>' +
          '<details class="opcoes-tarefa"' + (aberto ? " open" : "") + '><summary><span>Categoria, horário e repetição</span><small>' + u.escaparHtml(resumo()) + "</small></summary>" +
            (op.mostrarDias ? '<p class="chips-rotulo">Em que dia?</p><div class="chips chips-dias" role="group" aria-label="Dia">' +
              proximos.map(function (d) {
                return '<button type="button" class="chip" data-dia="' + d.dia + '" aria-pressed="' + (d.dia === dia) + '"><b>' + (d.dia === op.hoje ? "Hoje" : L.DIAS_CURTOS[d.semana]) + "</b><small>" + d.numero + "</small></button>";
              }).join("") + "</div>" : "") +
            '<p class="chips-rotulo">Categoria</p><div class="chips" role="group" aria-label="Categoria">' +
              '<button type="button" class="chip" data-cat="" aria-pressed="' + (!categoriaId) + '">Sem categoria</button>' +
              cats.map(function (c) {
                return '<button type="button" class="chip chip-cat" style="--cat:' + c.cor + '" data-cat="' + u.escaparHtml(c.id) + '" aria-pressed="' + (c.id === categoriaId) + '"><i></i>' + u.escaparHtml(c.nome) + "</button>";
              }).join("") + "</div>" +
            '<p class="chips-rotulo">Horário (opcional)</p><div class="horarios">' +
              '<label>Das<input class="campo campo-hora" type="time" name="inicio" value="' + inicio + '" aria-label="Horário de início"></label>' +
              '<label>até<input class="campo campo-hora" type="time" name="fim" value="' + fim + '" aria-label="Horário de fim"></label>' +
              (inicio || fim ? '<button type="button" class="botao-icone" data-limpar-hora aria-label="Limpar horário" title="Limpar horário">' + App.icone("x") + "</button>" : "") + "</div>" +
            '<p class="chips-rotulo">Repetir?</p><div class="chips" role="group" aria-label="Repetir">' + opcoesRepete.map(function (o) {
              return '<button type="button" class="chip chip-texto" data-repete="' + o[0] + '" aria-pressed="' + (o[0] === repete) + '">' + u.escaparHtml(o[1]) + "</button>";
            }).join("") + "</div>" +
          "</details>" +
          '<p class="erro" role="alert">' + u.escaparHtml(erro) + "</p>" +
        "</form>";
      campo = el.querySelector(".nova-tarefa input"); campo.value = valor;
      if (tinhaFoco) campo.focus();
    }

    el.addEventListener("click", function (ev) {
      var d = ev.target.closest("[data-dia]"), r = ev.target.closest("[data-repete]"), c = ev.target.closest("[data-cat]"), l = ev.target.closest("[data-limpar-hora]");
      if (d) { dia = d.getAttribute("data-dia"); desenhar(); }
      else if (r) { repete = r.getAttribute("data-repete"); desenhar(); }
      else if (c) { categoriaId = c.getAttribute("data-cat") || null; desenhar(); }
      else if (l) { inicio = ""; fim = ""; erro = ""; desenhar(); }
    });
    el.addEventListener("input", function (ev) {                      // guarda os horários enquanto digita (sem redesenhar)
      if (ev.target.name === "inicio") inicio = ev.target.value; else if (ev.target.name === "fim") fim = ev.target.value;
    });
    el.addEventListener("change", function (ev) { if (ev.target.name === "inicio" || ev.target.name === "fim") desenhar(); });   // atualiza o resumo
    el.addEventListener("toggle", function (ev) { if (ev.target.classList && ev.target.classList.contains("opcoes-tarefa")) aberto = ev.target.open; }, true);
    el.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var r = op.aoAdicionar({ texto: campo.value, dia: dia, repete: repete, categoriaId: categoriaId, inicio: inicio, fim: fim });
      if (r.ok) { campo.value = ""; repete = "nenhuma"; inicio = ""; fim = ""; erro = ""; if (r.aviso) App.aviso(r.aviso); }
      else erro = r.erro || "";
      desenhar(); campo.focus();
    });

    desenhar();
    return {
      /* a faixa da semana mudou o dia selecionado */
      definirDia: function (novo) { if (novo !== dia) { dia = novo; desenhar(); } },
      definirHoje: function (h) { op.hoje = h; proximos = L.proximosDias(h, 7); desenhar(); },
      /* as categorias foram criadas, renomeadas ou apagadas */
      atualizarCategorias: function () { desenhar(); },
      focar: function () { campo.focus(); }
    };
  }
  return { criar: criar };
})();
