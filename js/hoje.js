/* =============================================================================
   hoje.js — A TELA PRINCIPAL
   -----------------------------------------------------------------------------
   Faixa com os próximos 7 dias, resumo do dia escolhido (com o botão "Começar agora"), formulário de
   nova tarefa e a lista separada em: tarefas do dia, tarefas diárias (que se repetem) e concluídas.
   Os dados vêm de App.armazenamento (da pessoa conectada); as contas, de App.logica.
   ============================================================================= */
App.hoje = (function () {
  var L = App.logica, u = App.utils, cfg = App.config, A = App.armazenamento;
  function $(id) { return document.getElementById(id); }

  var dados = null, hoje = null, selecionado = null, formulario = null, apagada = null, montado = false;

  function salvar() { A.gravar(dados); }
  function dataDe(dia) { var p = dia.split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function maiuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function itensDe(dia) { return L.itensDoDia(dados, dia); }

  /* ---------- desenhar ---------- */
  function desenharSemana() {
    $("semana").innerHTML = L.proximosDias(hoje, 7).map(function (d) {
      var it = itensDe(d.dia).todos, p = L.progresso(it);
      var estado = !it.length ? "" : p.feitas === p.total ? " completo" : " tem";
      return '<button type="button" class="dia' + estado + '" data-dia="' + d.dia + '" aria-pressed="' + (d.dia === selecionado) + '" aria-label="' +
        u.escaparHtml(maiuscula(L.nomeDoDia(d.dia, hoje)) + ", dia " + d.numero) + '"><small>' + (d.dia === hoje ? "Hoje" : L.DIAS_CURTOS[d.semana]) +
        "</small><b>" + d.numero + '</b><i aria-hidden="true"></i></button>';
    }).join("");
  }

  function desenharResumo() {
    var itens = itensDe(selecionado).todos, p = L.progresso(itens), seq = L.sequencia(dados, hoje);
    var ehHoje = selecionado === hoje, proxima = L.ordenar(itens).filter(function (i) { return !i.feita; })[0];
    var titulo = p.total ? p.feitas + " de " + p.total + " feitas" : maiuscula(L.nomeDoDia(selecionado, hoje));
    var botao;
    if (ehHoje) {
      var tp = proxima ? tempoDe(proxima) : null;
      var rotulo = proxima ? " Começar agora (" + L.textoDuracao(tp.seg).replace(" minutos", " min").replace(" minuto", " min") + ")" : (p.total ? " Tudo feito por hoje" : " Adicione uma tarefa");
      botao = '<button class="botao botao-primario botao-grande botao-largo" data-acao="comecar"' + (proxima ? "" : " disabled") + ">" + App.icone("play") + rotulo + "</button>";
    } else {
      botao = '<button class="botao botao-borda botao-grande botao-largo" data-acao="hoje">Voltar para hoje</button>';
    }
    $("resumo").innerHTML =
      '<div class="resumo-topo"><div><p class="resumo-data">' + u.escaparHtml(u.dataPorExtenso(dataDe(selecionado))) + "</p>" +
        '<h1 class="resumo-titulo">' + u.escaparHtml(titulo) + "</h1></div>" + '<span class="resumo-pct">' + p.pct + "%</span></div>" +
      '<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.pct + '"><i style="width:' + p.pct + '%"></i></div>' +
      '<p class="resumo-mensagem">' + u.escaparHtml(L.mensagem(p, cfg.MINUTOS_FOCO)) + "</p>" + botao +
      '<p class="resumo-sequencia">' + App.icone("chama") + " " +
        (seq.dias === 0 ? "Faça uma tarefa hoje para começar a sua sequência" :
          seq.dias + (seq.dias === 1 ? " dia seguido" : " dias seguidos") + " · melhor: " + L.melhorSequencia(dados)) + "</p>";
    var selo = $("selo-sequencia");
    selo.hidden = seq.dias === 0;
    selo.innerHTML = App.icone("chama") + "<b>" + seq.dias + "</b>";
    selo.title = seq.dias + (seq.dias === 1 ? " dia seguido" : " dias seguidos");
    selo.classList.toggle("apagado", !seq.cumpridoHoje);
  }

  function desenharPendentes() {
    var antigas = selecionado === hoje ? L.pendentesAntigas(dados.tarefas, hoje) : [], el = $("aviso-pendentes");
    el.hidden = antigas.length === 0;
    if (!antigas.length) { el.innerHTML = ""; return; }
    el.innerHTML = "<p><strong>" + antigas.length + (antigas.length === 1 ? " tarefa ficou" : " tarefas ficaram") + "</strong> de dias anteriores sem fazer.</p>" +
      '<div class="aviso-acoes"><button class="botao botao-primario botao-pequeno" data-pendentes="trazer">Trazer para hoje</button>' +
      '<button class="botao botao-borda botao-pequeno" data-pendentes="dispensar">Dispensar</button></div>';
  }

  function categoriaDe(id) { return dados.categorias.filter(function (c) { return c.id === id; })[0] || null; }

  /* mostrarCat = false na visão "por categoria" (o título do grupo já diz a categoria) */
  function linha(i, mostrarCat) {
    var podeComecar = !i.feita && selecionado === hoje, cat = mostrarCat === false ? null : categoriaDe(i.categoriaId);
    var hora = L.rotuloHorario(i.inicio, i.fim), dur = L.duracao(i.inicio, i.fim);
    return '<li class="tarefa' + (i.feita ? " feita" : "") + '" data-chave="' + u.escaparHtml(i.chave) + '">' +
      '<button type="button" class="tarefa-check" data-acao="alternar" aria-pressed="' + i.feita + '" aria-label="' + (i.feita ? "Desmarcar" : "Marcar como feita") + ": " + u.escaparHtml(i.texto) + '">' + App.icone("check") + "</button>" +
      '<button type="button" class="tarefa-texto" data-acao="editar" aria-label="Editar: ' + u.escaparHtml(i.texto) + '"><span class="tarefa-nome">' + u.escaparHtml(i.texto) + "</span>" +
        (hora ? '<small class="tarefa-hora">' + App.icone("relogio") + " " + u.escaparHtml(hora) + (dur ? " · " + dur : "") + "</small>" : "") +
        (cat ? '<small class="tarefa-cat" style="--cat:' + cat.cor + '"><i></i>' + u.escaparHtml(cat.nome) + "</small>" : "") +
        (i.repete ? '<small class="tarefa-tag">' + App.icone("repetir") + " " + u.escaparHtml(i.repete) + "</small>" : "") +
        (i.veioDe ? '<small class="tarefa-origem">veio de ' + u.escaparHtml(i.veioDe.split("-").reverse().slice(0, 2).join("/")) + "</small>" : "") + "</button>" +
      (podeComecar ? '<button type="button" class="tarefa-botao" data-acao="foco" aria-label="Começar agora: ' + u.escaparHtml(i.texto) + '" title="Começar agora">' + App.icone("play") + "</button>" : "") +
      '<button type="button" class="tarefa-botao tarefa-apagar" data-acao="apagar" aria-label="Apagar: ' + u.escaparHtml(i.texto) + '" title="Apagar">' + App.icone("x") + "</button></li>";
  }
  function grupo(titulo, lista, classe) {
    if (!lista.length) return "";
    return '<section class="grupo ' + (classe || "") + '"><h2 class="grupo-titulo">' + u.escaparHtml(titulo) + '<span class="grupo-qtd">' + lista.length + "</span></h2>" +
      '<ul class="lista-tarefas">' + lista.map(function (i) { return linha(i, true); }).join("") + "</ul></section>";
  }

  function desenharBarra() {
    var v = dados.visao === "categoria" ? "categoria" : "tipo";
    $("barra-lista").innerHTML =
      '<div class="segmentos segmentos-2" role="group" aria-label="Como ver a lista">' +
        '<button type="button" data-visao="tipo" aria-pressed="' + (v === "tipo") + '">Por tipo</button>' +
        '<button type="button" data-visao="categoria" aria-pressed="' + (v === "categoria") + '">Por categoria</button></div>' +
      '<button type="button" class="botao botao-borda botao-pequeno" data-acao="categorias">' + App.icone("etiqueta") + " Categorias</button>";
  }

  function desenharGrupos() {
    var it = itensDe(selecionado), ehHoje = selecionado === hoje, html = "";
    if (dados.visao === "categoria") {
      /* uma seção por categoria, com tudo dela (de hoje, diárias e concluídas), em ordem de horário */
      L.porCategoria(it.todos, dados.categorias).forEach(function (g) {
        var feitas = g.itens.filter(function (i) { return i.feita; }).length, nome = g.categoria ? g.categoria.nome : "Sem categoria";
        var idCat = g.categoria ? g.categoria.id : "_sem", recolhida = !!dados.recolhidas[idCat];
        html += '<section class="grupo grupo-cat' + (recolhida ? " recolhida" : "") + '" style="--cat:' + (g.categoria ? g.categoria.cor : "var(--borda-forte)") + '">' +
          '<h2 class="grupo-titulo"><button type="button" class="grupo-botao" data-recolher="' + u.escaparHtml(idCat) + '" aria-expanded="' + (!recolhida) + '" title="' + (recolhida ? "Mostrar" : "Recolher") + ' ' + u.escaparHtml(nome) + '">' +
            '<i class="cat-ponto"></i><span class="grupo-nome">' + u.escaparHtml(nome) + '</span><span class="grupo-qtd">' + feitas + "/" + g.itens.length + '</span><i class="seta" aria-hidden="true"></i></button></h2>' +
          '<ul class="lista-tarefas"' + (recolhida ? " hidden" : "") + ">" + g.itens.map(function (i) { return linha(i, false); }).join("") + "</ul></section>";
      });
    } else {
      var tituloDia = ehHoje ? "Tarefas de hoje" : "Tarefas para " + L.nomeDoDia(selecionado, hoje);
      var unicasAFazer = L.ordenar(it.unicas).filter(function (i) { return !i.feita; });
      var rotinasAFazer = L.ordenar(it.rotinas).filter(function (i) { return !i.feita; });
      var concluidas = L.ordenar(it.todos).filter(function (i) { return i.feita; });
      html = grupo(tituloDia, unicasAFazer) + grupo("Tarefas diárias", rotinasAFazer, "grupo-rotinas");
      if (concluidas.length) {
        html += '<details class="grupo grupo-concluidas" open><summary class="grupo-titulo">Concluídas<span class="grupo-qtd">' + concluidas.length + "</span></summary>" +
          '<ul class="lista-tarefas">' + concluidas.map(function (i) { return linha(i, true); }).join("") + "</ul></details>";
      }
    }
    $("grupos").innerHTML = html;
    $("vazio").hidden = it.todos.length > 0;
    $("vazio").innerHTML = ehHoje ? "Nenhuma tarefa para hoje ainda.<br>Escreva a primeira acima. Quanto menor, melhor." : "Nada marcado para " + u.escaparHtml(L.nomeDoDia(selecionado, hoje)) + ".<br>Escreva acima para planejar esse dia.";
  }

  function desenhar() {
    var nome = A.atual() ? A.atual().nome : "";
    $("botao-perfil").textContent = nome.charAt(0).toUpperCase() || "?";
    $("botao-perfil").title = nome; $("menu-nome").textContent = nome;
    desenharSemana(); desenharResumo(); desenharPendentes(); desenharBarra(); desenharGrupos();
  }

  /* ---------- ações ---------- */
  function achar(chave, dia) { return itensDe(dia).todos.filter(function (i) { return i.chave === chave; })[0] || null; }

  function alternar(chave, dia) {
    dia = dia || selecionado;
    var item = achar(chave, dia); if (!item) return;
    var vaiFazer = !item.feita;
    if (item.tipo === "rotina") {
      var k = L.chaveFeita(item.rotinaId, dia);
      if (vaiFazer) dados.feitas[k] = Date.now(); else delete dados.feitas[k];
    } else {
      dados.tarefas.forEach(function (t) { if (t.id === chave) t.feitaEm = vaiFazer ? Date.now() : null; });
    }
    salvar(); desenhar();
    if (vaiFazer) { var p = L.progresso(itensDe(dia).todos); App.aviso(p.feitas === p.total ? "Tudo feito! Boa." : "Feito! Boa."); }
  }

  function apagar(chave) {
    var item = achar(chave, selecionado); if (!item) return;
    if (item.tipo === "rotina") {
      if (!window.confirm("Apagar \"" + item.texto + "\"? Como ela se repete (" + item.repete + "), vai sumir de todos os dias.")) return;
      var j = dados.rotinas.map(function (r) { return r.id; }).indexOf(item.rotinaId);
      apagada = { lista: "rotinas", objeto: dados.rotinas[j], posicao: j }; dados.rotinas.splice(j, 1);
    } else {
      var i = dados.tarefas.map(function (t) { return t.id; }).indexOf(chave);
      apagada = { lista: "tarefas", objeto: dados.tarefas[i], posicao: i }; dados.tarefas.splice(i, 1);
    }
    salvar(); desenhar();
    App.aviso("Tarefa apagada.", { texto: "Desfazer", aoClicar: function () {
      if (!apagada) return;
      var l = dados[apagada.lista]; l.splice(Math.min(apagada.posicao, l.length), 0, apagada.objeto); apagada = null; salvar(); desenhar();
    } });
  }

  /* Quanto tempo o cronômetro vai contar para uma tarefa: o do horário dela (início até fim) ou o padrão. */
  function tempoDe(item) {
    var seg = L.duracaoSegundos(item.inicio, item.fim);
    return seg ? { seg: seg, rotulo: "Tempo da tarefa: " + L.rotuloHorario(item.inicio, item.fim) + " (" + L.textoDuracao(seg) + ")" }
               : { seg: cfg.MINUTOS_FOCO * 60, rotulo: "Só " + cfg.MINUTOS_FOCO + " minutos. Comece." };
  }
  function comecar(chave) {
    var it = L.ordenar(itensDe(hoje).todos).filter(function (i) { return !i.feita; });
    var item = chave ? it.filter(function (i) { return i.chave === chave; })[0] : it[0];
    if (!item) return;
    var t = tempoDe(item);
    App.foco.iniciar({ id: item.chave, texto: item.texto }, t.seg, t.rotulo);
  }

  /* Tocar na tarefa abre a edição (texto, dia, repetição, horário e categoria). */
  function editar(chave) {
    var item = achar(chave, selecionado); if (!item) return;
    App.editar.abrir(item, dados, hoje, function (r, est) {
      salvar(); desenhar();
      var novo = achar(r.chave, selecionado), msg;
      if (!novo) {   // a tarefa saiu desta tela (mudou de dia ou não cai mais neste dia da semana)
        var quando = est.repete === "diaria" ? "todo dia" : L.rotuloDias(est.diasSel);
        msg = est.repete === "nenhuma" ? "Salvo. A tarefa foi para " + L.nomeDoDia(est.dia, hoje) + "."
            : (!est.eraRotina && est.dia > selecionado) ? "Salvo. Ela começa " + (L.nomeDoDia(est.dia, hoje) === "hoje" ? "hoje" : L.nomeDoDia(est.dia, hoje)) + " e se repete (" + quando + ")."
            : "Salvo. Ela não cai neste dia (" + quando + ").";
      } else {
        var batem = novo.inicio && novo.fim ? L.conflitos(itensDe(selecionado).todos.filter(function (i) { return i.chave !== r.chave; }), novo.inicio, novo.fim) : [];
        msg = batem.length ? "Salvo. Atenção: bate com “" + batem[0].texto + "” (" + L.rotuloHorario(batem[0].inicio, batem[0].fim) + ")."
            : novo.repete ? "Tarefa atualizada (" + novo.repete + ")." : "Tarefa atualizada.";
      }
      App.aviso(msg);
    });
  }

  function escolherDia(dia) {
    selecionado = dia; formulario.definirDia(dia); desenhar();
  }

  /* ---------- montagem (uma vez só) ---------- */
  function montarUmaVez() {
    montado = true;
    formulario = App.formulario.criar($("formulario-principal"), {
      hoje: hoje, diaInicial: selecionado, mostrarDias: false, abrirOpcoes: false,
      categorias: function () { return dados.categorias; },
      aoAdicionar: function (def) {
        var r = App.perfil.adicionarTarefa(dados, def, hoje);
        if (r.ok) { salvar(); desenhar(); }
        return r;
      }
    });
    $("semana").addEventListener("click", function (ev) { var b = ev.target.closest("[data-dia]"); if (b) escolherDia(b.getAttribute("data-dia")); });
    $("barra-lista").addEventListener("click", function (ev) {
      var v = ev.target.closest("[data-visao]"), c = ev.target.closest("[data-acao=categorias]");
      if (v) { dados.visao = v.getAttribute("data-visao"); salvar(); desenhar(); }
      else if (c) App.categorias.abrir(dados, salvar, function () { formulario.atualizarCategorias(); desenhar(); });
    });
    $("grupos").addEventListener("click", function (ev) {
      var rec = ev.target.closest("[data-recolher]");
      if (rec) {   // encolher / abrir a categoria (a escolha fica guardada)
        var id = rec.getAttribute("data-recolher");
        if (dados.recolhidas[id]) delete dados.recolhidas[id]; else dados.recolhidas[id] = true;
        salvar(); desenhar(); return;
      }
      var b = ev.target.closest("[data-acao]"), li = ev.target.closest("[data-chave]");
      if (!b || !li) return;
      var acao = b.getAttribute("data-acao"), chave = li.getAttribute("data-chave");
      if (acao === "alternar") alternar(chave); else if (acao === "apagar") apagar(chave); else if (acao === "foco") comecar(chave); else if (acao === "editar") editar(chave);
    });
    $("resumo").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-acao]"); if (!b) return;
      if (b.getAttribute("data-acao") === "comecar") comecar(); else if (b.getAttribute("data-acao") === "hoje") escolherDia(hoje);
    });
    $("aviso-pendentes").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-pendentes]"); if (!b) return;
      var antigas = L.pendentesAntigas(dados.tarefas, hoje), ids = antigas.map(function (t) { return t.id; });
      if (b.getAttribute("data-pendentes") === "trazer") {
        L.trazerParaHoje(dados.tarefas, ids, hoje);
        App.aviso(ids.length + (ids.length === 1 ? " tarefa trazida" : " tarefas trazidas") + " para hoje.");
      } else {
        if (!window.confirm("Dispensar " + ids.length + (ids.length === 1 ? " tarefa" : " tarefas") + " que ficaram para trás? Elas serão apagadas.")) return;
        dados.tarefas = dados.tarefas.filter(function (t) { return ids.indexOf(t.id) === -1; });
      }
      salvar(); desenhar();
    });

    /* menu da pessoa (inicial do nome no topo) */
    $("botao-perfil").addEventListener("click", function (ev) { ev.stopPropagation(); $("menu-perfil").hidden = !$("menu-perfil").hidden; });
    document.addEventListener("click", function (ev) { if (!ev.target.closest("#menu-perfil")) $("menu-perfil").hidden = true; });
    $("botao-sair").addEventListener("click", function () { $("menu-perfil").hidden = true; App.perfil.sair(); });

    /* "Terminei a tarefa" no cronômetro (o cronômetro é sempre de uma tarefa de HOJE) */
    App.foco.ligar($("foco"), function (chave) { var i = achar(chave, hoje); if (i && !i.feita) alternar(chave, hoje); });

    /* virou o dia com o app aberto, ou voltou para o app: relê e redesenha */
    function atualizarDia() {
      if ($("app").hidden || !A.atual()) return;
      var agora = L.diaDe(new Date());
      if (agora !== hoje) { var estavaEmHoje = selecionado === hoje; hoje = agora; if (estavaEmHoje || selecionado < hoje) selecionado = hoje; formulario.definirHoje(hoje); formulario.definirDia(selecionado); }
      dados = A.recarregar(); desenhar();
    }
    setInterval(function () { if (L.diaDe(new Date()) !== hoje) atualizarDia(); }, 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) atualizarDia(); });
  }

  /* Mostra a tela principal para a pessoa conectada. */
  function abrir() {
    dados = A.ler(); hoje = L.diaDe(new Date()); selecionado = hoje;
    document.getElementById("entrada").hidden = true; document.getElementById("criar-lista").hidden = true;
    $("app").hidden = false; $("menu-perfil").hidden = true;
    if (!montado) montarUmaVez(); else { formulario.definirHoje(hoje); formulario.definirDia(hoje); App.foco.restaurar(); }
    desenhar();
  }

  return { abrir: abrir };
})();
