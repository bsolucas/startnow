/* =============================================================================
   formulario.js — FORMULÁRIO "NOVA TAREFA" (usado na tela principal e na criação da lista)
   -----------------------------------------------------------------------------
   Campo de texto + "quando": só num dia, toda semana naquele dia da semana, ou todo dia.
   Na criação da lista (mostrarDias) também escolhe qual dia; na tela principal o dia vem da faixa da semana.
   Uso:  var f = App.formulario.criar(elemento, { hoje, diaInicial, mostrarDias, aoAdicionar(def) });
         def = { texto, dia, repete: "nenhuma" | "semanal" | "diaria" }   (aoAdicionar devolve true se aceitou)
   ============================================================================= */
App.formulario = (function () {
  var L = App.logica, u = App.utils;

  function criar(el, op) {
    var dia = op.diaInicial || op.hoje, repete = "nenhuma", campo, form;
    var proximos = L.proximosDias(op.hoje, 7);

    function nomeCurto(d) { return d === op.hoje ? "hoje" : d === L.somarDias(op.hoje, 1) ? "amanhã" : L.DIAS_LONGOS[L.diaSemana(d)]; }

    function desenhar() {
      var valor = campo ? campo.value : "", tinhaFoco = campo && document.activeElement === campo;
      var semana = L.DIAS_LONGOS[L.diaSemana(dia)];
      var opcoesRepete = [["nenhuma", "Só " + (dia === op.hoje ? "hoje" : "em " + nomeCurto(dia))], ["semanal", "Toda " + semana], ["diaria", "Todo dia"]];
      el.innerHTML =
        '<form class="form-tarefa" autocomplete="off">' +
          '<div class="nova-tarefa"><input class="campo" maxlength="140" placeholder="O que fazer?" aria-label="Nova tarefa" enterkeyhint="done" />' +
          '<button class="botao botao-primario" type="submit">Adicionar</button></div>' +
          (op.mostrarDias ? '<p class="chips-rotulo">Em que dia?</p><div class="chips chips-dias" role="group" aria-label="Dia">' +
            proximos.map(function (d) {
              return '<button type="button" class="chip" data-dia="' + d.dia + '" aria-pressed="' + (d.dia === dia) + '"><b>' + (d.dia === op.hoje ? "Hoje" : L.DIAS_CURTOS[d.semana]) + '</b><small>' + d.numero + "</small></button>";
            }).join("") + "</div>" : "") +
          '<p class="chips-rotulo">Repetir?</p>' +
          '<div class="chips" role="group" aria-label="Repetir">' + opcoesRepete.map(function (o) {
            return '<button type="button" class="chip chip-texto" data-repete="' + o[0] + '" aria-pressed="' + (o[0] === repete) + '">' + u.escaparHtml(o[1]) + "</button>";
          }).join("") + "</div>" +
        "</form>";
      form = el.querySelector("form"); campo = form.querySelector("input"); campo.value = valor;
      if (tinhaFoco) campo.focus();
    }

    el.addEventListener("click", function (ev) {
      var d = ev.target.closest("[data-dia]"), r = ev.target.closest("[data-repete]");
      if (d) { dia = d.getAttribute("data-dia"); desenhar(); }
      else if (r) { repete = r.getAttribute("data-repete"); desenhar(); }
    });
    el.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (op.aoAdicionar({ texto: campo.value, dia: dia, repete: repete })) { campo.value = ""; repete = "nenhuma"; desenhar(); }
      campo.focus();
    });

    desenhar();
    return {
      /* a faixa da semana mudou o dia selecionado */
      definirDia: function (novo) { if (novo !== dia) { dia = novo; desenhar(); } },
      definirHoje: function (h) { op.hoje = h; proximos = L.proximosDias(h, 7); desenhar(); },
      focar: function () { campo.focus(); }
    };
  }
  return { criar: criar };
})();
