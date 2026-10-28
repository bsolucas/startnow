/* =============================================================================
   formulario.js — FORMULÁRIO "NOVA TAREFA" (usado na tela principal e na criação da lista)
   -----------------------------------------------------------------------------
   Campo de texto + uma área "Categoria, horário e repetição":
     • Categoria: Trabalho, Casa, Estudos... (as da pessoa; ou "Sem categoria");
     • Horário (opcional): "das 09:00 até 10:30" (js/horas.js);
     • Repetir: só naquele dia, nos DIAS DA SEMANA que você escolher (ex.: seg, qua e sex), ou todo dia.
   Na criação da lista (mostrarDias) também escolhe qual dia; na tela principal o dia vem da faixa da semana.
   Uso:  var f = App.formulario.criar(elemento, { hoje, diaInicial, mostrarDias, abrirOpcoes, categorias(), aoAdicionar(def) });
         def = { texto, dia, repete: "nenhuma"|"semanal"|"diaria", diasSemana, categoriaId, inicio, fim }
         aoAdicionar devolve { ok: true, aviso? } ou { ok: false, erro } (o erro aparece embaixo do formulário).
   Os horários NÃO redesenham o formulário (só atualizam o resumo), para a lista de horas não fechar sozinha.
   ============================================================================= */
App.formulario = (function () {
  var L = App.logica, u = App.utils;

  function criar(el, op) {
    var dia = op.diaInicial || op.hoje, repete = "nenhuma", diasSel = [L.diaSemana(dia)], diasEditados = false;
    var categoriaId = null, inicio = "", fim = "", erro = "", aberto = !!op.abrirOpcoes, campo;
    var proximos = L.proximosDias(op.hoje, 7);

    function categorias() { return (op.categorias && op.categorias()) || []; }
    function nomeCurto(d) { return d === op.hoje ? "hoje" : d === L.somarDias(op.hoje, 1) ? "amanhã" : L.DIAS_LONGOS[L.diaSemana(d)]; }
    function acertarDias() { if (!diasEditados) diasSel = [L.diaSemana(dia)]; }   // enquanto não mexeu, acompanha o dia escolhido

    function resumo() {
      var cat = categorias().filter(function (c) { return c.id === categoriaId; })[0];
      var hora = L.rotuloHorario(inicio || null, fim || null);
      var rep = repete === "diaria" ? "todo dia" : repete === "semanal" ? (diasSel.length ? L.rotuloDias(diasSel) : "escolha os dias") : "só " + (dia === op.hoje ? "hoje" : "em " + nomeCurto(dia));
      return (cat ? cat.nome : "Sem categoria") + " · " + (hora || "sem horário") + " · " + rep;
    }
    function atualizarResumo() {
      var s = el.querySelector(".opcoes-tarefa summary small"); if (s) s.textContent = resumo();
      var b = el.querySelector("[data-limpar-hora]"); if (b) b.hidden = !(inicio || fim);
    }

    function desenhar() {
      var valor = campo ? campo.value : "", tinhaFoco = campo && document.activeElement === campo;
      var cats = categorias();
      if (categoriaId && !cats.some(function (c) { return c.id === categoriaId; })) categoriaId = null;   // a categoria foi apagada
      var opcoesRepete = [["nenhuma", "Só " + (dia === op.hoje ? "hoje" : "em " + nomeCurto(dia))], ["semanal", "Dias da semana"], ["diaria", "Todo dia"]];
      el.innerHTML =
        '<form class="form-tarefa" autocomplete="off">' +
          '<div class="nova-tarefa"><input class="campo" maxlength="140" placeholder="O que fazer?" aria-label="Nova tarefa" enterkeyhint="done" />' +
          '<button class="botao botao-primario" type="submit">Adicionar</button></div>' +
          '<details class="opcoes-tarefa"' + (aberto ? " open" : "") + '><summary><span>Categoria, horário e repetição</span><small></small></summary>' +
            (op.mostrarDias ? '<p class="chips-rotulo">Em que dia?</p><div class="chips chips-dias" role="group" aria-label="Dia">' +
              proximos.map(function (d) {
                return '<button type="button" class="chip" data-dia="' + d.dia + '" aria-pressed="' + (d.dia === dia) + '"><b>' + (d.dia === op.hoje ? "Hoje" : L.DIAS_CURTOS[d.semana]) + "</b><small>" + d.numero + "</small></button>";
              }).join("") + "</div>" : "") +
            '<p class="chips-rotulo">Categoria</p><div class="chips" role="group" aria-label="Categoria">' +
              '<button type="button" class="chip" data-cat="" aria-pressed="' + (!categoriaId) + '">Sem categoria</button>' +
              cats.map(function (c) {
                return '<button type="button" class="chip chip-cat" style="--cat:' + c.cor + '" data-cat="' + u.escaparHtml(c.id) + '" aria-pressed="' + (c.id === categoriaId) + '"><i></i>' + u.escaparHtml(c.nome) + "</button>";
              }).join("") + "</div>" +
            '<p class="chips-rotulo">Horário (opcional)</p><div class="horarios">' + App.horas.html("inicio", inicio, "Das") + App.horas.html("fim", fim, "até") +
              '<button type="button" class="botao-icone" data-limpar-hora aria-label="Limpar horário" title="Limpar horário"' + (inicio || fim ? "" : " hidden") + ">" + App.icone("x") + "</button></div>" +
            '<p class="chips-rotulo">Repetir?</p><div class="chips" role="group" aria-label="Repetir">' + opcoesRepete.map(function (o) {
              return '<button type="button" class="chip chip-texto" data-repete="' + o[0] + '" aria-pressed="' + (o[0] === repete) + '">' + u.escaparHtml(o[1]) + "</button>";
            }).join("") + "</div>" +
            (repete === "semanal" ? '<div class="chips chips-semana" role="group" aria-label="Dias da semana">' + L.DIAS_CURTOS.map(function (n, i) {
              return '<button type="button" class="chip" data-semana="' + i + '" aria-pressed="' + (diasSel.indexOf(i) !== -1) + '" aria-label="' + L.DIAS_LONGOS[i] + '">' + n + "</button>"; }).join("") + "</div>" : "") +
          "</details>" +
          '<p class="erro" role="alert">' + u.escaparHtml(erro) + "</p>" +
        "</form>";
      campo = el.querySelector(".nova-tarefa input"); campo.value = valor;
      if (tinhaFoco) campo.focus();
      atualizarResumo();
    }

    el.addEventListener("click", function (ev) {
      var d = ev.target.closest("[data-dia]"), r = ev.target.closest("[data-repete]"), c = ev.target.closest("[data-cat]"), l = ev.target.closest("[data-limpar-hora]"), s = ev.target.closest("[data-semana]");
      if (d) { dia = d.getAttribute("data-dia"); acertarDias(); desenhar(); }
      else if (r) { repete = r.getAttribute("data-repete"); acertarDias(); desenhar(); }
      else if (s) {
        var n = Number(s.getAttribute("data-semana")), i = diasSel.indexOf(n);
        if (i === -1) diasSel.push(n); else diasSel.splice(i, 1);
        diasEditados = true; desenhar();
      }
      else if (c) { categoriaId = c.getAttribute("data-cat") || null; desenhar(); }
      else if (l) { inicio = ""; fim = ""; erro = ""; desenhar(); }
    });
    /* horário: só guarda e atualiza o resumo; NÃO redesenha (assim a lista de horas não fecha sozinha) */
    App.horas.ligar(el, function (nome, valor) { if (nome === "inicio") inicio = valor; else fim = valor; atualizarResumo(); });
    el.addEventListener("toggle", function (ev) { if (ev.target.classList && ev.target.classList.contains("opcoes-tarefa")) aberto = ev.target.open; }, true);
    el.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var r = op.aoAdicionar({ texto: campo.value, dia: dia, repete: repete, diasSemana: repete === "semanal" ? diasSel.slice() : [], categoriaId: categoriaId, inicio: inicio, fim: fim });
      if (r.ok) { campo.value = ""; repete = "nenhuma"; diasEditados = false; acertarDias(); inicio = ""; fim = ""; erro = ""; if (r.aviso) App.aviso(r.aviso); }
      else erro = r.erro || "";
      desenhar(); campo.focus();
    });

    desenhar();
    return {
      /* a faixa da semana mudou o dia selecionado */
      definirDia: function (novo) { if (novo !== dia) { dia = novo; acertarDias(); desenhar(); } },
      definirHoje: function (h) { op.hoje = h; proximos = L.proximosDias(h, 7); desenhar(); },
      /* as categorias foram criadas, renomeadas ou apagadas */
      atualizarCategorias: function () { desenhar(); },
      focar: function () { campo.focus(); }
    };
  }
  return { criar: criar };
})();
