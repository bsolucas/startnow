/* =============================================================================
   foco.js — "COMEÇAR AGORA": CRONÔMETRO DE 5 MINUTOS EM UMA TAREFA
   -----------------------------------------------------------------------------
   O truque contra a procrastinação: você não precisa terminar a tarefa, só ficar 5 minutos nela.
   Quando o tempo acaba, o app pergunta: terminou? mais 5 minutos? ou pausa por agora?
   O fim é guardado como um horário (fimEm), então o cronômetro continua certo mesmo se o
   celular travar a tela ou o app for fechado e aberto de novo.
   ============================================================================= */
App.foco = (function () {
  var L = App.logica, el, intervalo = null, ctx = null;
  var estado = null;          // { tarefaId, texto, fimEm, duracao, terminou }
  var aoConcluirTarefa = function () {};

  function dados() { return App.armazenamento.ler(); }
  function guardar() { var d = dados(); d.foco = estado ? { tarefaId: estado.tarefaId, texto: estado.texto, fimEm: estado.fimEm, duracao: estado.duracao } : null; App.armazenamento.gravar(d); }

  /* Som e vibração do fim. O áudio só toca se foi "destravado" por um toque (ver iniciar). */
  function avisarFim() {
    try {
      if (ctx) [880, 1175].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.22;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.45);
      });
    } catch (e) { /* sem som */ }
    if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  }

  function desenhar() {
    if (!estado) { el.hidden = true; el.innerHTML = ""; return; }
    var restante = Math.max(0, Math.ceil((estado.fimEm - Date.now()) / 1000));
    var acabou = restante === 0;
    var pct = estado.duracao ? Math.min(1, 1 - restante / estado.duracao) : 1;
    var CIRC = 2 * Math.PI * 88;
    el.hidden = false;
    el.innerHTML =
      '<div class="foco-caixa" role="dialog" aria-modal="true" aria-label="Foco">' +
        '<p class="foco-rotulo">' + (acabou ? "Tempo!" : "Só " + Math.round(estado.duracao / 60) + " minutos. Comece.") + "</p>" +
        '<h2 class="foco-tarefa">' + App.utils.escaparHtml(estado.texto) + "</h2>" +
        '<div class="foco-anel"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="foco-trilho" cx="100" cy="100" r="88"/>' +
          '<circle class="foco-progresso" cx="100" cy="100" r="88" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + (CIRC * (1 - pct)).toFixed(1) + '"/></svg>' +
          '<span class="foco-tempo" id="foco-tempo">' + L.formatarTempo(restante) + "</span></div>" +
        (acabou
          ? '<p class="foco-pergunta">Como foi? Já valeu por ter começado.</p>' +
            '<div class="foco-acoes"><button class="botao botao-primario botao-grande" data-foco="concluir">Terminei a tarefa</button>' +
            '<button class="botao botao-borda botao-grande" data-foco="mais">Mais ' + App.config.MINUTOS_FOCO + " minutos</button>" +
            '<button class="botao botao-texto" data-foco="parar">Parar por agora</button></div>'
          : '<div class="foco-acoes"><button class="botao botao-primario botao-grande" data-foco="concluir">Terminei a tarefa</button>' +
            '<button class="botao botao-texto" data-foco="parar">Desistir por agora</button></div>') +
      "</div>";
  }

  function tique() {
    if (!estado) return;
    var restante = Math.ceil((estado.fimEm - Date.now()) / 1000);
    if (restante <= 0 && !estado.terminou) { estado.terminou = true; clearInterval(intervalo); intervalo = null; avisarFim(); desenhar(); return; }
    var t = document.getElementById("foco-tempo");
    if (t) t.textContent = L.formatarTempo(restante);
    desenhar();
  }

  function comecarRelogio() { clearInterval(intervalo); intervalo = setInterval(tique, 500); }

  /* Começa o cronômetro para uma tarefa. Precisa ser chamado a partir de um toque (para destravar o som). */
  function iniciar(tarefa, minutos) {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { ctx = null; }
    var seg = (minutos || App.config.MINUTOS_FOCO) * 60;
    estado = { tarefaId: tarefa.id, texto: tarefa.texto, fimEm: Date.now() + seg * 1000, duracao: seg, terminou: false };
    guardar(); desenhar(); comecarRelogio();
  }
  function encerrar() { estado = null; clearInterval(intervalo); intervalo = null; guardar(); desenhar(); }

  function aoClicar(ev) {
    var b = ev.target.closest("[data-foco]");
    if (!b || !estado) return;
    var acao = b.getAttribute("data-foco");
    if (acao === "concluir") { var id = estado.tarefaId; encerrar(); aoConcluirTarefa(id); }
    else if (acao === "parar") encerrar();
    else if (acao === "mais") {
      var seg = App.config.MINUTOS_FOCO * 60;
      estado.fimEm = Date.now() + seg * 1000; estado.duracao = seg; estado.terminou = false;
      guardar(); desenhar(); comecarRelogio();
    }
  }

  /* Retoma o foco da pessoa conectada, se o app foi fechado no meio (ou mostra "Tempo!" se já passou). */
  function restaurar() {
    estado = null; clearInterval(intervalo); intervalo = null;
    var f = dados().foco;
    if (f && f.fimEm) {
      estado = { tarefaId: f.tarefaId, texto: f.texto, fimEm: f.fimEm, duracao: f.duracao, terminou: f.fimEm <= Date.now() };
      desenhar(); if (!estado.terminou) comecarRelogio();
    } else desenhar();
  }
  /* Esquece o cronômetro que está na tela SEM mexer nos dados (ao trocar de pessoa). */
  function limpar() { estado = null; clearInterval(intervalo); intervalo = null; if (el) { el.hidden = true; el.innerHTML = ""; } }

  /* Liga o módulo. aoConcluir(chave) é chamado quando a pessoa diz "terminei". */
  function ligar(elemento, aoConcluir) {
    el = elemento; aoConcluirTarefa = aoConcluir;
    el.addEventListener("click", aoClicar);
    restaurar();
  }
  return { ligar: ligar, restaurar: restaurar, limpar: limpar, iniciar: iniciar, ativo: function () { return !!estado; } };
})();
