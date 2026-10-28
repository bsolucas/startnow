/* =============================================================================
   horas.js — SELETOR DE HORÁRIO (hora e minuto em duas listas)
   -----------------------------------------------------------------------------
   Substitui o campo nativo <input type="time">, que no celular "seleciona sozinho" a cada movimento da
   roda e se perdia quando a tela era redesenhada. Aqui são duas listas comuns (hora 00-23 e minuto de 5
   em 5): o valor só muda quando a pessoa escolhe, e o formato é sempre 24 horas.
   Regras: escolher a hora já põe ":00" nos minutos; limpar a hora limpa os minutos.
   Valor: "HH:MM" ou "" (sem horário).
   Uso:  App.horas.html("inicio", "09:30", "Das")  -> texto HTML
         App.horas.ligar(raiz, function (nome, valor) { ... })   // uma vez, na raiz que contém os seletores
         App.horas.ler(raiz, "inicio") / App.horas.definir(raiz, "inicio", "10:00")
   ============================================================================= */
App.horas = (function () {
  function dois(n) { return (n < 10 ? "0" : "") + n; }

  function opcoesHora(h) {
    var o = '<option value="">--</option>';
    for (var i = 0; i < 24; i++) o += '<option value="' + dois(i) + '"' + (h === dois(i) ? " selected" : "") + ">" + dois(i) + "</option>";
    return o;
  }
  /* minutos de 5 em 5; se o horário guardado tiver outro minuto (ex.: 07), ele entra na lista para não se perder */
  function opcoesMin(m) {
    var lista = [];
    for (var i = 0; i < 60; i += 5) lista.push(dois(i));
    if (m && lista.indexOf(m) === -1) { lista.push(m); lista.sort(); }
    return '<option value="">--</option>' + lista.map(function (x) { return '<option value="' + x + '"' + (m === x ? " selected" : "") + ">" + x + "</option>"; }).join("");
  }

  function html(nome, valor, rotulo) {
    var p = (valor || "").split(":"), h = p[0] || "", m = p[1] || "";
    return '<span class="hora-grupo"><span class="hora-rotulo">' + rotulo + "</span>" +
      '<span class="hora" data-hora="' + nome + '">' +
        '<select class="campo campo-sel" data-h aria-label="Hora (' + rotulo.toLowerCase() + ')">' + opcoesHora(h) + "</select><b>:</b>" +
        '<select class="campo campo-sel" data-m aria-label="Minutos (' + rotulo.toLowerCase() + ')">' + opcoesMin(m) + "</select></span></span>";
  }

  function caixa(raiz, nome) { return raiz.querySelector('[data-hora="' + nome + '"]'); }
  function ler(raiz, nome) {
    var c = caixa(raiz, nome); if (!c) return "";
    var h = c.querySelector("[data-h]").value, m = c.querySelector("[data-m]").value;
    return h ? h + ":" + (m || "00") : "";
  }
  function definir(raiz, nome, valor) {
    var c = caixa(raiz, nome); if (!c) return;
    var p = (valor || "").split(":");
    c.querySelector("[data-h]").value = p[0] || "";
    var sm = c.querySelector("[data-m]"), m = p[1] || "";
    if (m && ![].some.call(sm.options, function (o) { return o.value === m; })) sm.insertAdjacentHTML("beforeend", '<option value="' + m + '">' + m + "</option>");
    sm.value = p[0] ? m : "";
  }

  /* Liga a raiz: quando uma lista muda, acerta a outra e avisa com o valor completo. */
  function ligar(raiz, aoMudar) {
    raiz.addEventListener("change", function (ev) {
      var sel = ev.target.closest("[data-hora] select"); if (!sel) return;
      var c = sel.closest("[data-hora]"), h = c.querySelector("[data-h]"), m = c.querySelector("[data-m]");
      if (sel === h) m.value = h.value ? (m.value || "00") : "";
      else if (!h.value && m.value) h.value = dois(new Date().getHours());      // escolheu o minuto antes da hora
      aoMudar(c.getAttribute("data-hora"), ler(raiz, c.getAttribute("data-hora")));
    });
  }
  return { html: html, ler: ler, definir: definir, ligar: ligar };
})();
