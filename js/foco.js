/* =============================================================================
   foco.js — "COMEÇAR AGORA": CRONÔMETRO DA TAREFA
   -----------------------------------------------------------------------------
   O tempo vem da própria tarefa: se ela tem horário (das 09:00 às 10:30), o cronômetro conta 1h30;
   se não tem, conta 5 minutos (o truque contra a procrastinação: só ficar um pouco nela).
   Dá para PAUSAR e RETOMAR. Quando o tempo acaba: terminei, mais 5 minutos ou parar.
   O fim é guardado como um horário (fimEm), então o cronômetro continua certo mesmo se o celular
   travar a tela ou o app for fechado; em pausa, guarda quanto faltava.
   Importante: a estrutura (botões) só é redesenhada quando o ESTADO muda. A cada meio segundo só o
   número e o anel mudam, senão um toque no botão podia se perder justo na hora do redesenho.
   ============================================================================= */
App.foco = (function () {
  var L = App.logica, u = App.utils, el, intervalo = null, ctx = null;
  /* estado: { tarefaId, texto, rotulo, duracao (s), fimEm (ms, rodando), restante (s, em pausa), pausado, terminou } */
  var estado = null;
  var aoConcluirTarefa = function () {};
  var CIRC = 2 * Math.PI * 88;

  function dados() { return App.armazenamento.ler(); }
  function guardar() {
    var d = dados();
    d.foco = estado ? { tarefaId: estado.tarefaId, texto: estado.texto, rotulo: estado.rotulo, duracao: estado.duracao,
                        fimEm: estado.pausado ? null : estado.fimEm, restante: estado.pausado ? estado.restante : null, pausado: !!estado.pausado } : null;
    App.armazenamento.gravar(d);
  }
  function restante() { return estado.pausado ? estado.restante : Math.max(0, Math.ceil((estado.fimEm - Date.now()) / 1000)); }
  function acabou() { return !estado.pausado && restante() === 0; }

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

  /* Desenha a tela inteira (textos e botões) conforme o estado: rodando, pausado ou terminado. */
  function desenhar() {
    if (!estado) { el.hidden = true; el.innerHTML = ""; return; }
    var fim = acabou(), pausa = estado.pausado;
    var rotulo = fim ? "Tempo!" : pausa ? "Em pausa" : estado.rotulo;
    var botoes;
    if (fim) {
      botoes = '<button class="botao botao-primario botao-grande" data-foco="concluir">Terminei a tarefa</button>' +
               '<button class="botao botao-borda botao-grande" data-foco="mais">Mais ' + App.config.MINUTOS_FOCO + " minutos</button>" +
               '<button class="botao botao-texto" data-foco="parar">Parar por agora</button>';
    } else {
      botoes = (pausa ? '<button class="botao botao-primario botao-grande" data-foco="retomar">' + App.icone("play") + " Retomar</button>"
                      : '<button class="botao botao-borda botao-grande" data-foco="pausar">' + App.icone("pausa") + " Pausar</button>") +
               '<button class="botao ' + (pausa ? "botao-borda" : "botao-primario") + ' botao-grande" data-foco="concluir">Terminei a tarefa</button>' +
               '<button class="botao botao-texto" data-foco="parar">Desistir por agora</button>';
    }
    el.hidden = false;
    el.innerHTML =
      '<div class="foco-caixa' + (pausa ? " pausado" : "") + '" role="dialog" aria-modal="true" aria-label="Cronômetro">' +
        '<p class="foco-rotulo">' + u.escaparHtml(rotulo) + "</p>" +
        '<h2 class="foco-tarefa">' + u.escaparHtml(estado.texto) + "</h2>" +
        '<div class="foco-anel"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="foco-trilho" cx="100" cy="100" r="88"/>' +
          '<circle class="foco-progresso" id="foco-progresso" cx="100" cy="100" r="88" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="0"/></svg>' +
          '<span class="foco-tempo" id="foco-tempo"></span></div>' +
        (fim ? '<p class="foco-pergunta">Como foi? Já valeu por ter começado.</p>' : "") +
        '<div class="foco-acoes">' + botoes + "</div></div>";
    atualizarTempo();
  }

  /* Só o número e o anel (sem mexer nos botões). */
  function atualizarTempo() {
    if (!estado) return;
    var r = restante(), pct = estado.duracao ? Math.min(1, Math.max(0, 1 - r / estado.duracao)) : 1;
    var t = document.getElementById("foco-tempo"), a = document.getElementById("foco-progresso");
    if (t) { t.textContent = L.formatarTempo(r); t.classList.toggle("longo", r >= 3600); }
    if (a) a.setAttribute("stroke-dashoffset", (CIRC * (1 - pct)).toFixed(1));
  }

  function tique() {
    if (!estado || estado.pausado) return;
    if (!estado.terminou && restante() === 0) {   // acabou agora: troca os botões uma única vez
      estado.terminou = true; clearInterval(intervalo); intervalo = null; avisarFim(); desenhar(); return;
    }
    atualizarTempo();
  }
  function comecarRelogio() { clearInterval(intervalo); intervalo = setInterval(tique, 500); }

  /* Começa o cronômetro. segundos = tempo da tarefa (ou o padrão); rotulo = frase de cima.
     Precisa ser chamado a partir de um toque (para destravar o som). */
  function iniciar(tarefa, segundos, rotulo) {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { ctx = null; }
    var seg = Math.max(1, Math.round(segundos || App.config.MINUTOS_FOCO * 60));
    estado = { tarefaId: tarefa.id, texto: tarefa.texto, rotulo: rotulo || "Só " + Math.round(seg / 60) + " minutos. Comece.", duracao: seg, fimEm: Date.now() + seg * 1000, pausado: false, terminou: false };
    guardar(); desenhar(); comecarRelogio();
  }
  function encerrar() { estado = null; clearInterval(intervalo); intervalo = null; guardar(); desenhar(); }

  function pausar() {
    if (!estado || estado.pausado || acabou()) return;
    estado.restante = restante(); estado.pausado = true;
    clearInterval(intervalo); intervalo = null; guardar(); desenhar();
  }
  function retomar() {
    if (!estado || !estado.pausado) return;
    estado.fimEm = Date.now() + estado.restante * 1000; estado.pausado = false;
    guardar(); desenhar(); comecarRelogio();
  }

  function aoClicar(ev) {
    var b = ev.target.closest("[data-foco]");
    if (!b || !estado) return;
    var acao = b.getAttribute("data-foco");
    if (acao === "concluir") { var id = estado.tarefaId; encerrar(); aoConcluirTarefa(id); }
    else if (acao === "parar") encerrar();
    else if (acao === "pausar") pausar();
    else if (acao === "retomar") retomar();
    else if (acao === "mais") {
      var seg = App.config.MINUTOS_FOCO * 60;
      estado.fimEm = Date.now() + seg * 1000; estado.duracao = seg; estado.pausado = false; estado.terminou = false;
      guardar(); desenhar(); comecarRelogio();
    }
  }

  /* Retoma o cronômetro da pessoa conectada, se o app foi fechado no meio (em pausa continua em pausa; vencido mostra "Tempo!"). */
  function restaurar() {
    estado = null; clearInterval(intervalo); intervalo = null;
    var f = dados().foco;
    if (f && (f.pausado || f.fimEm)) {
      estado = { tarefaId: f.tarefaId, texto: f.texto, rotulo: f.rotulo || "", duracao: f.duracao, pausado: !!f.pausado,
                 restante: f.restante, fimEm: f.fimEm, terminou: !f.pausado && f.fimEm <= Date.now() };
      desenhar(); if (!estado.pausado && !estado.terminou) comecarRelogio();
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
  return { ligar: ligar, restaurar: restaurar, limpar: limpar, iniciar: iniciar, pausar: pausar, retomar: retomar, ativo: function () { return !!estado; } };
})();
