/* =============================================================================
   editar.js — EDITAR UMA TAREFA (tocar nela na lista)
   -----------------------------------------------------------------------------
   Abre uma folha para mudar: o texto, o DIA, a REPETIÇÃO (só num dia, nos dias da semana que você escolher,
   ou todo dia), o horário (das HH:MM até HH:MM) e a categoria.
   • Tarefa de um dia só pode virar uma tarefa que se repete (e o contrário).
   • Se ela já se repete, o que você mudar vale para todos os dias dela (a folha avisa).
   • Os horários usam o seletor de js/horas.js e NÃO redesenham a folha (a lista de horas não fecha sozinha).
   Uso:  App.editar.abrir(item, dados, hoje, aoSalvar)   // aoSalvar(resultado, { repete, dia })
   ============================================================================= */
App.editar = (function () {
  var L = App.logica, u = App.utils, painel = document.getElementById("painel-editar");
  var dados = null, item = null, hoje = null, aoSalvar = null, anterior = null, original = null;
  var s = null;   // estado da folha: { texto, dia, repete, diasSel, categoriaId, inicio, fim, erro }

  function nomeCurto(d) { return d === hoje ? "hoje" : d === L.somarDias(hoje, 1) ? "amanhã" : L.DIAS_LONGOS[L.diaSemana(d)]; }

  function dias() {   // os próximos 7 dias + o dia atual da tarefa (se for outro)
    var lista = L.proximosDias(hoje, 7);
    if (s.dia && !lista.some(function (d) { return d.dia === s.dia; })) lista.unshift({ dia: s.dia, semana: L.diaSemana(s.dia), numero: Number(s.dia.slice(8)) });
    return lista;
  }

  function desenhar() {
    var campoTexto = painel.querySelector("#ed-texto"); if (campoTexto) s.texto = campoTexto.value;
    var ehRotina = item.tipo === "rotina", repeteAgora = s.repete !== "nenhuma";
    var mostrarDia = !ehRotina || !repeteAgora;       // rotina que continua rotina não tem "dia": vale para todos os dias dela
    var rotuloDia = repeteAgora ? "Começa em" : "Em que dia?";
    var opcoesRepete = [["nenhuma", "Só num dia"], ["semanal", "Dias da semana"], ["diaria", "Todo dia"]];
    painel.innerHTML =
      '<div class="painel-fundo" data-fechar></div>' +
      '<form class="painel-folha" id="ed-form" role="dialog" aria-modal="true" aria-labelledby="ed-titulo" autocomplete="off">' +
        '<div class="painel-topo"><h2 id="ed-titulo">Editar tarefa</h2><button type="button" class="botao-icone" data-fechar aria-label="Fechar">' + App.icone("x") + "</button></div>" +
        (ehRotina && repeteAgora ? '<p class="aviso-rotina">' + App.icone("repetir") + " Esta tarefa se repete (" + u.escaparHtml(item.repete) + "). O que você mudar vale para todos os dias dela.</p>" : "") +
        '<p class="chips-rotulo">Tarefa</p><input class="campo" id="ed-texto" maxlength="140" value="' + u.escaparHtml(s.texto) + '" aria-label="Texto da tarefa" />' +
        (mostrarDia ? '<p class="chips-rotulo">' + rotuloDia + '</p><div class="chips chips-dias" role="group" aria-label="Dia">' +
          dias().map(function (d) {
            return '<button type="button" class="chip" data-dia="' + d.dia + '" aria-pressed="' + (d.dia === s.dia) + '"><b>' + (d.dia === hoje ? "Hoje" : L.DIAS_CURTOS[d.semana]) + "</b><small>" + d.numero + "</small></button>";
          }).join("") + "</div>" : "") +
        '<p class="chips-rotulo">Repetir?</p><div class="chips" role="group" aria-label="Repetir">' + opcoesRepete.map(function (o) {
          return '<button type="button" class="chip chip-texto" data-repete="' + o[0] + '" aria-pressed="' + (o[0] === s.repete) + '">' + o[1] + "</button>"; }).join("") + "</div>" +
        (s.repete === "semanal" ? '<div class="chips chips-semana" role="group" aria-label="Dias da semana">' + L.DIAS_CURTOS.map(function (n, i) {
          return '<button type="button" class="chip" data-semana="' + i + '" aria-pressed="' + (s.diasSel.indexOf(i) !== -1) + '" aria-label="' + L.DIAS_LONGOS[i] + '">' + n + "</button>"; }).join("") + "</div>" : "") +
        '<p class="chips-rotulo">Horário</p><div class="horarios">' + App.horas.html("inicio", s.inicio, "Das") + App.horas.html("fim", s.fim, "até") +
          '<button type="button" class="botao-icone" data-limpar aria-label="Tirar o horário" title="Tirar o horário">' + App.icone("x") + "</button></div>" +
        '<p class="chips-rotulo">Categoria</p><div class="chips" role="group" aria-label="Categoria">' +
          '<button type="button" class="chip" data-cat="" aria-pressed="' + (!s.categoriaId) + '">Sem categoria</button>' +
          dados.categorias.map(function (c) {
            return '<button type="button" class="chip chip-cat" style="--cat:' + c.cor + '" data-cat="' + u.escaparHtml(c.id) + '" aria-pressed="' + (c.id === s.categoriaId) + '"><i></i>' + u.escaparHtml(c.nome) + "</button>"; }).join("") + "</div>" +
        '<p class="erro" id="ed-erro" role="alert">' + u.escaparHtml(s.erro) + "</p>" +
        '<div class="painel-acoes"><button type="button" class="botao botao-borda" data-fechar>Cancelar</button><button type="submit" class="botao botao-primario">Salvar</button></div>' +
      "</form>";
  }

  function abrir(it, d, hojeDia, depois) {
    item = it; dados = d; hoje = hojeDia; aoSalvar = depois; anterior = document.activeElement;
    var ehRotina = it.tipo === "rotina";
    var rot = ehRotina ? d.rotinas.filter(function (r) { return r.id === it.rotinaId; })[0] : null;
    s = { texto: it.texto, dia: ehRotina ? it.dia : it.dia, repete: ehRotina ? rot.tipo : "nenhuma",
          diasSel: ehRotina ? rot.diasSemana.slice() : [L.diaSemana(it.dia)], diasMexidos: ehRotina, categoriaId: it.categoriaId || null, inicio: it.inicio || "", fim: it.fim || "", erro: "" };
    original = { ehRotina: ehRotina };
    desenhar();
    painel.hidden = false; document.body.style.overflow = "hidden";
    painel.querySelector("#ed-texto").focus();
  }
  function fechar() {
    painel.hidden = true; painel.innerHTML = ""; document.body.style.overflow = "";
    if (anterior && anterior.focus) anterior.focus();
  }

  painel.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-fechar]")) return fechar();
    var d = ev.target.closest("[data-dia]"), r = ev.target.closest("[data-repete]"), c = ev.target.closest("[data-cat]"), w = ev.target.closest("[data-semana]"), l = ev.target.closest("[data-limpar]");
    /* enquanto a pessoa não mexeu nos dias da semana, eles acompanham o dia escolhido (como no formulário de nova tarefa) */
    function acompanhar() { if (!s.diasMexidos) s.diasSel = [L.diaSemana(s.dia)]; }
    if (d) { s.dia = d.getAttribute("data-dia"); acompanhar(); desenhar(); }
    else if (r) {
      s.repete = r.getAttribute("data-repete");
      if (s.repete === "semanal") { acompanhar(); if (!s.diasSel.length) s.diasSel = [L.diaSemana(s.dia)]; }
      desenhar();
    } else if (w) {
      var n = Number(w.getAttribute("data-semana")), i = s.diasSel.indexOf(n);
      if (i === -1) s.diasSel.push(n); else s.diasSel.splice(i, 1);
      s.diasMexidos = true; desenhar();
    } else if (c) { s.categoriaId = c.getAttribute("data-cat") || null; desenhar(); }
    else if (l) { s.inicio = ""; s.fim = ""; desenhar(); }
  });
  /* horário: só guarda; NÃO redesenha */
  App.horas.ligar(painel, function (nome, valor) { if (nome === "inicio") s.inicio = valor; else s.fim = valor; });

  painel.addEventListener("submit", function (ev) {
    ev.preventDefault();
    s.texto = painel.querySelector("#ed-texto").value;
    var campos = { texto: s.texto, categoriaId: s.categoriaId, inicio: s.inicio, fim: s.fim, repete: s.repete, diasSemana: s.repete === "semanal" ? s.diasSel : [] };
    // o "dia" só vale quando é uma tarefa de um dia, ou quando uma tarefa de um dia vai passar a se repetir (dia de início)
    if (!original.ehRotina || s.repete === "nenhuma") campos.dia = s.dia;
    var r = L.editarItem(dados, item.chave, campos, App.config.MAX_TEXTO_TAREFA);
    if (!r.ok) { s.erro = r.erro; var e = painel.querySelector("#ed-erro"); if (e) e.textContent = r.erro; return; }
    var estado = { repete: s.repete, dia: s.dia, diasSel: s.diasSel.slice(), eraRotina: original.ehRotina };
    fechar(); aoSalvar(r, estado);
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !painel.hidden) fechar(); });

  return { abrir: abrir };
})();
