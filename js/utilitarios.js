/* =============================================================================
   utilitarios.js — AJUDANTES PEQUENOS (usados pelas telas)
   ============================================================================= */
App.utils = {
  /* Evita que um texto digitado vire HTML (segurança: nunca coloque texto do usuário no HTML sem isto). */
  escaparHtml: function (texto) {
    return String(texto == null ? "" : texto).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  },
  /* "terça-feira, 28 de outubro" */
  dataPorExtenso: function (data) {
    var t;
    try { t = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(data); }
    catch (e) { t = data.toLocaleDateString(); }
    return t.charAt(0).toUpperCase() + t.slice(1);   // só a primeira letra maiúscula: "Terça-feira, 27 de outubro"
  }
};

/* Ícones simples (traço fino, herdam a cor do texto). */
App.icone = function (nome) {
  var ico = {
    check:  '<path d="M20 6 9 17l-5-5"/>',
    play:   '<polygon points="6 4 20 12 6 20 6 4"/>',
    x:      '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chama:  '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    mais:   '<path d="M5 12h14"/><path d="M12 5v14"/>',
    relogio:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  }[nome] || "";
  return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ico + "</svg>";
};

/* Aviso rápido no pé da tela. acao = { texto, aoClicar } (opcional, ex.: "Desfazer"). */
App.aviso = (function () {
  var el, timer;
  return function (texto, acao) {
    el = el || document.getElementById("aviso");
    clearTimeout(timer);
    el.textContent = texto;
    if (acao) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = acao.texto;
      b.addEventListener("click", function () { el.classList.remove("ligado"); acao.aoClicar(); });
      el.appendChild(b);
    }
    el.classList.add("ligado");
    timer = setTimeout(function () { el.classList.remove("ligado"); }, acao ? 6000 : 2500);
  };
})();
