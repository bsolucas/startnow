/* =============================================================================
   hoje.js — A TELA PRINCIPAL ("HOJE")
   -----------------------------------------------------------------------------
   Lista do dia, resumo com o botão "Começar agora", tarefas que sobraram de ontem
   e a sequência de dias. Os dados vêm de App.armazenamento; as contas, de App.logica.
   ============================================================================= */
(function () {
  var L = App.logica, u = App.utils, cfg = App.config, $ = function (id) { return document.getElementById(id); };
  var dados = App.armazenamento.ler();
  var hoje = L.diaDe(new Date());
  var apagada = null;   // última tarefa apagada (para o "Desfazer")

  function salvar() { App.armazenamento.gravar(dados); }
  function tarefaPorId(id) { return dados.tarefas.filter(function (t) { return t.id === id; })[0] || null; }
  function aFazer() { return L.ordenar(L.tarefasDoDia(dados.tarefas, hoje)).filter(function (t) { return !t.feitaEm; }); }

  /* ---------- desenhar ---------- */
  function desenharResumo() {
    var lista = L.tarefasDoDia(dados.tarefas, hoje), p = L.progresso(lista), seq = L.sequencia(dados.tarefas, hoje);
    var proxima = aFazer()[0];
    var rotuloBotao = proxima ? " Começar agora (" + cfg.MINUTOS_FOCO + " min)" : (p.total ? " Tudo feito por hoje" : " Adicione uma tarefa");
    $("resumo").innerHTML =
      '<div class="resumo-topo"><div><p class="resumo-data">' + u.escaparHtml(u.dataPorExtenso(new Date())) + "</p>" +
        '<h1 class="resumo-titulo">' + (p.total ? p.feitas + " de " + p.total + " feitas" : "Hoje") + "</h1></div>" +
        '<span class="resumo-pct">' + p.pct + "%</span></div>" +
      '<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.pct + '"><i style="width:' + p.pct + '%"></i></div>' +
      '<p class="resumo-mensagem">' + u.escaparHtml(L.mensagem(p, cfg.MINUTOS_FOCO)) + "</p>" +
      '<button class="botao botao-primario botao-grande botao-largo" id="botao-comecar"' + (proxima ? "" : " disabled") + ">" + App.icone("play") + rotuloBotao + "</button>" +
      '<p class="resumo-sequencia">' + App.icone("chama") + " " +
        (seq.dias === 0 ? "Faça uma tarefa hoje para começar a sua sequência" :
          seq.dias + (seq.dias === 1 ? " dia seguido" : " dias seguidos") + " · melhor: " + L.melhorSequencia(dados.tarefas)) + "</p>";
    var selo = $("selo-sequencia");
    selo.hidden = seq.dias === 0;
    selo.innerHTML = App.icone("chama") + "<b>" + seq.dias + "</b>";
    selo.title = seq.dias + (seq.dias === 1 ? " dia seguido" : " dias seguidos");
    selo.classList.toggle("apagado", !seq.cumpridoHoje);
  }

  function desenharPendentes() {
    var antigas = L.pendentesAntigas(dados.tarefas, hoje), el = $("aviso-pendentes");
    el.hidden = antigas.length === 0;
    if (!antigas.length) { el.innerHTML = ""; return; }
    el.innerHTML = '<p><strong>' + antigas.length + (antigas.length === 1 ? " tarefa ficou" : " tarefas ficaram") + "</strong> de dias anteriores sem fazer.</p>" +
      '<div class="aviso-acoes"><button class="botao botao-primario botao-pequeno" data-pendentes="trazer">Trazer para hoje</button>' +
      '<button class="botao botao-borda botao-pequeno" data-pendentes="dispensar">Dispensar</button></div>';
  }

  function desenharLista() {
    var lista = L.ordenar(L.tarefasDoDia(dados.tarefas, hoje));
    $("vazio").hidden = lista.length > 0;
    $("lista-tarefas").innerHTML = lista.map(function (t) {
      var feita = !!t.feitaEm;
      return '<li class="tarefa' + (feita ? " feita" : "") + '" data-id="' + t.id + '">' +
        '<button type="button" class="tarefa-check" data-acao="alternar" aria-pressed="' + feita + '" aria-label="' + (feita ? "Desmarcar" : "Marcar como feita") + ": " + u.escaparHtml(t.texto) + '">' + App.icone("check") + "</button>" +
        '<span class="tarefa-texto">' + u.escaparHtml(t.texto) + (t.veioDe ? ' <small class="tarefa-origem">veio de ' + u.escaparHtml(t.veioDe.split("-").reverse().slice(0, 2).join("/")) + "</small>" : "") + "</span>" +
        (feita ? "" : '<button type="button" class="tarefa-botao" data-acao="foco" aria-label="Começar agora: ' + u.escaparHtml(t.texto) + '" title="Começar agora">' + App.icone("play") + "</button>") +
        '<button type="button" class="tarefa-botao tarefa-apagar" data-acao="apagar" aria-label="Apagar: ' + u.escaparHtml(t.texto) + '" title="Apagar">' + App.icone("x") + "</button></li>";
    }).join("");
  }

  function desenhar() { desenharResumo(); desenharPendentes(); desenharLista(); }

  /* ---------- ações ---------- */
  function adicionar(texto) {
    var t = L.novaTarefa(texto, hoje, Date.now(), cfg.MAX_TEXTO_TAREFA);
    if (!t) return false;
    dados.tarefas.push(t); salvar(); desenhar();
    return true;
  }
  function alternar(id) {
    var t = tarefaPorId(id); if (!t) return;
    var vaiFazer = !t.feitaEm;
    t.feitaEm = vaiFazer ? Date.now() : null;
    salvar(); desenhar();
    if (vaiFazer) {
      var p = L.progresso(L.tarefasDoDia(dados.tarefas, hoje));
      App.aviso(p.feitas === p.total ? "Dia fechado! Tudo feito." : "Feito! Boa.");
    }
  }
  function apagar(id) {
    var i = dados.tarefas.map(function (t) { return t.id; }).indexOf(id);
    if (i === -1) return;
    apagada = { tarefa: dados.tarefas[i], posicao: i };
    dados.tarefas.splice(i, 1); salvar(); desenhar();
    App.aviso("Tarefa apagada.", { texto: "Desfazer", aoClicar: function () {
      if (!apagada) return;
      dados.tarefas.splice(Math.min(apagada.posicao, dados.tarefas.length), 0, apagada.tarefa); apagada = null; salvar(); desenhar();
    } });
  }
  function comecar(id) {
    var t = id ? tarefaPorId(id) : aFazer()[0];
    if (!t) { $("campo-tarefa").focus(); return; }
    App.foco.iniciar(t, cfg.MINUTOS_FOCO);
  }

  /* ---------- eventos ---------- */
  $("form-tarefa").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var campo = $("campo-tarefa");
    if (adicionar(campo.value)) { campo.value = ""; }
    campo.focus();
  });
  $("lista-tarefas").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-acao]"), li = ev.target.closest("[data-id]");
    if (!b || !li) return;
    var acao = b.getAttribute("data-acao"), id = li.getAttribute("data-id");
    if (acao === "alternar") alternar(id); else if (acao === "apagar") apagar(id); else if (acao === "foco") comecar(id);
  });
  $("resumo").addEventListener("click", function (ev) { if (ev.target.closest("#botao-comecar")) comecar(); });
  $("aviso-pendentes").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-pendentes]"); if (!b) return;
    var antigas = L.pendentesAntigas(dados.tarefas, hoje);
    if (b.getAttribute("data-pendentes") === "trazer") {
      L.trazerParaHoje(dados.tarefas, antigas.map(function (t) { return t.id; }), hoje);
      App.aviso(antigas.length + (antigas.length === 1 ? " tarefa trazida" : " tarefas trazidas") + " para hoje.");
    } else {
      var ids = antigas.map(function (t) { return t.id; });
      if (!window.confirm("Dispensar " + ids.length + (ids.length === 1 ? " tarefa" : " tarefas") + " que ficaram para trás? Elas serão apagadas.")) return;
      dados.tarefas = dados.tarefas.filter(function (t) { return ids.indexOf(t.id) === -1; });
    }
    salvar(); desenhar();
  });

  /* "Terminei a tarefa" no cronômetro */
  App.foco.ligar($("foco"), function (id) { if (tarefaPorId(id) && !tarefaPorId(id).feitaEm) alternar(id); });

  /* Virou o dia com o app aberto: começa a lista nova. */
  setInterval(function () {
    var agora = L.diaDe(new Date());
    if (agora !== hoje) { hoje = agora; dados = App.armazenamento.recarregar(); desenhar(); }
  }, 30000);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    var agora = L.diaDe(new Date());
    if (agora !== hoje) { hoje = agora; }
    dados = App.armazenamento.recarregar(); desenhar();
  });

  document.title = cfg.NOME_APP;
  desenhar();
})();
