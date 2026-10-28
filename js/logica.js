/* =============================================================================
   logica.js — REGRAS DO APP (sem tela, sem navegador: dá para testar no Node)
   -----------------------------------------------------------------------------
   Há dois tipos de tarefa:
     • ÚNICA (de um dia):  { id, texto, dia: "2026-10-28", criadaEm, feitaEm: ms|null, veioDe? }
     • ROTINA (que repete): { id, texto, tipo: "diaria" | "semanal", diasSemana: [0..6], desde: "2026-10-28", criadaEm }
       Cada vez que uma rotina é feita num dia, isso é guardado em  dados.feitas["<idDaRotina>|<dia>"] = horário.
   "dia" é sempre a data local, no formato AAAA-MM-DD. Dia da semana: 0 = domingo ... 6 = sábado.

   Toda tarefa (única ou rotina) pode ter também:
     categoriaId: "c-trabalho" (ou null)   inicio: "09:00" (ou null)   fim: "10:30" (ou null)
   Categorias (subcategorias) são da pessoa: { id, nome, cor }. Já vêm 6 prontas e ela cria, renomeia e apaga.

   Dados completos de uma pessoa:
     { versao: 3, nome, tarefas: [], rotinas: [], feitas: {}, categorias: [], visao: "tipo"|"categoria", recolhidas: {}, foco: null }

   Regra da sequência (dias seguidos): um dia conta quando pelo menos UMA tarefa (única ou rotina) foi
   concluída nele. A barra é baixa de propósito: o objetivo é começar, não fazer tudo.
   ============================================================================= */
(function (raiz) {
  var L = {};
  function dois(n) { return (n < 10 ? "0" : "") + n; }
  L.DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  L.DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  /* ---------- datas ---------- */
  /* "2026-10-28" no fuso do aparelho (não em UTC, para o dia virar à meia-noite daqui). */
  L.diaDe = function (quando) {
    var d = quando instanceof Date ? quando : new Date(quando);
    return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate());
  };
  function dataDe(dia) { var p = dia.split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0); }   // meio-dia: o horário de verão não bagunça
  L.somarDias = function (dia, n) { var d = dataDe(dia); d.setDate(d.getDate() + n); return L.diaDe(d); };
  L.diaSemana = function (dia) { return dataDe(dia).getDay(); };
  /* Os próximos n dias a partir de hoje (hoje primeiro): para a faixa da semana. */
  L.proximosDias = function (hoje, n) {
    var lista = [];
    for (var i = 0; i < (n || 7); i++) { var dia = L.somarDias(hoje, i); lista.push({ dia: dia, semana: L.diaSemana(dia), numero: Number(dia.slice(8)) }); }
    return lista;
  };
  /* "hoje", "amanhã" ou o nome do dia ("quarta"). */
  L.nomeDoDia = function (dia, hoje) {
    if (dia === hoje) return "hoje";
    if (dia === L.somarDias(hoje, 1)) return "amanhã";
    return L.DIAS_LONGOS[L.diaSemana(dia)];
  };

  /* ---------- tarefas ---------- */
  function limparTexto(texto, max) {
    var t = String(texto == null ? "" : texto).replace(/\s+/g, " ").trim();
    return t ? t.slice(0, max || 140) : null;
  }
  function novoId(prefixo, agora) { return prefixo + agora.toString(36) + Math.random().toString(36).slice(2, 6); }

  /* Tarefa de um dia só. Devolve null se o texto estiver vazio. */
  L.novaTarefa = function (texto, dia, agora, max, extra) {
    var t = limparTexto(texto, max); if (!t) return null;
    return aplicarExtra({ id: novoId("t", agora), texto: t, dia: dia, criadaEm: agora, feitaEm: null }, extra);
  };
  /* categoria e horário (opcionais) vão junto da tarefa */
  function aplicarExtra(obj, extra) {
    extra = extra || {};
    obj.categoriaId = extra.categoriaId || null; obj.inicio = extra.inicio || null; obj.fim = extra.fim || null;
    return obj;
  }
  /* Tarefa que se repete. tipo "diaria" = todo dia; "semanal" = nos dias da semana informados (ex.: [2] = toda terça). */
  L.novaRotina = function (texto, tipo, diasSemana, desde, agora, max, extra) {
    var t = limparTexto(texto, max); if (!t) return null;
    var dias = tipo === "diaria" ? [0, 1, 2, 3, 4, 5, 6] : L.limparDias(diasSemana);
    if (!dias.length) return null;
    return aplicarExtra({ id: novoId("r", agora), texto: t, tipo: tipo === "diaria" ? "diaria" : "semanal", diasSemana: dias, desde: desde, criadaEm: agora }, extra);
  };
  /* A rotina acontece neste dia? (só a partir do dia em que foi criada) */
  L.rotinaOcorre = function (rotina, dia) { return dia >= rotina.desde && rotina.diasSemana.indexOf(L.diaSemana(dia)) !== -1; };
  L.chaveFeita = function (rotinaId, dia) { return rotinaId + "|" + dia; };
  /* "todo dia", "de segunda a sexta", "fins de semana", "toda terça" ou "toda segunda, quarta e sexta". */
  L.rotuloDias = function (dias) {
    var d = dias.slice().sort().join(",");
    if (d === "0,1,2,3,4,5,6") return "todo dia";
    if (d === "1,2,3,4,5") return "de segunda a sexta";
    if (d === "0,6") return "fins de semana";
    var nomes = dias.slice().sort().map(function (x) { return L.DIAS_LONGOS[x]; });
    return "toda " + (nomes.length > 1 ? nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1] : nomes[0]);
  };
  L.rotuloRepete = function (rotina) { return rotina.tipo === "diaria" ? "todo dia" : L.rotuloDias(rotina.diasSemana); };
  /* Deixa só dias da semana válidos (0 a 6), sem repetir, em ordem. */
  L.limparDias = function (dias) {
    return (dias || []).filter(function (d, i, a) { return d >= 0 && d <= 6 && a.indexOf(d) === i; }).sort();
  };

  /* Tudo o que existe num dia, já separado em "únicas" e "rotinas". Cada item:
     { chave, tipo: "unica"|"rotina", texto, dia, feita, feitaEm, criadaEm, repete?, veioDe? }
     A "chave" da rotina é "r:<id>"; a da tarefa única é o próprio id. */
  L.itensDoDia = function (dados, dia) {
    var feitas = dados.feitas || {};
    var unicas = (dados.tarefas || []).filter(function (t) { return t.dia === dia; }).map(function (t) {
      return { chave: t.id, tipo: "unica", texto: t.texto, dia: dia, feita: !!t.feitaEm, feitaEm: t.feitaEm || null, criadaEm: t.criadaEm, veioDe: t.veioDe,
               categoriaId: t.categoriaId || null, inicio: t.inicio || null, fim: t.fim || null };
    });
    var rotinas = (dados.rotinas || []).filter(function (r) { return L.rotinaOcorre(r, dia); }).map(function (r) {
      var f = feitas[L.chaveFeita(r.id, dia)] || null;
      return { chave: "r:" + r.id, tipo: "rotina", rotinaId: r.id, texto: r.texto, dia: dia, feita: !!f, feitaEm: f, criadaEm: r.criadaEm, repete: L.rotuloRepete(r),
               categoriaId: r.categoriaId || null, inicio: r.inicio || null, fim: r.fim || null };
    });
    return { unicas: unicas, rotinas: rotinas, todos: unicas.concat(rotinas) };
  };

  /* Lista na ordem da tela: as que faltam primeiro, as feitas no fim. Em cada grupo: quem tem horário vem antes
     (do mais cedo para o mais tarde) e depois as sem horário, na ordem de criação. Aceita itens ou tarefas. */
  L.ordenar = function (lista) {
    return lista.slice().sort(function (a, b) {
      var fa = (a.feita || a.feitaEm) ? 1 : 0, fb = (b.feita || b.feitaEm) ? 1 : 0;
      if (fa !== fb) return fa - fb;
      var ia = a.inicio || null, ib = b.inicio || null;
      if (ia && ib && ia !== ib) return ia < ib ? -1 : 1;
      if (ia && !ib) return -1;
      if (!ia && ib) return 1;
      return a.criadaEm - b.criadaEm;
    });
  };

  /* ---------- horários ---------- */
  /* "9:05" ou "09:05" -> "09:05"; devolve null se não for uma hora válida (00:00 a 23:59). */
  L.normalizarHora = function (texto) {
    var m = /^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/.exec(String(texto == null ? "" : texto));
    return m ? dois(Number(m[1])) + ":" + m[2] : null;
  };
  L.minutos = function (hora) { var p = hora.split(":"); return Number(p[0]) * 60 + Number(p[1]); };
  /* Confere início e fim (ambos opcionais). Devolve { ok, inicio, fim, erro }. */
  L.validarHorario = function (inicio, fim) {
    var i = (inicio == null || String(inicio).trim() === "") ? null : L.normalizarHora(inicio);
    var f = (fim == null || String(fim).trim() === "") ? null : L.normalizarHora(fim);
    if (inicio && String(inicio).trim() && !i) return { ok: false, erro: "O horário de início não é válido." };
    if (fim && String(fim).trim() && !f) return { ok: false, erro: "O horário de fim não é válido." };
    if (f && !i) return { ok: false, erro: "Informe também o horário de início." };
    if (i && f && L.minutos(f) <= L.minutos(i)) return { ok: false, erro: "O fim precisa ser depois do início." };
    return { ok: true, inicio: i, fim: f };
  };
  /* "09:00–10:30", "a partir das 09:00" ou "" (sem horário). */
  L.rotuloHorario = function (inicio, fim) {
    if (inicio && fim) return inicio + "–" + fim;
    return inicio ? "a partir das " + inicio : "";
  };
  /* "1h30", "45min", "2h" (só quando há início e fim). */
  L.duracao = function (inicio, fim) {
    if (!inicio || !fim) return "";
    var m = L.minutos(fim) - L.minutos(inicio), h = Math.floor(m / 60), r = m % 60;
    return h ? h + "h" + (r ? dois(r) : "") : r + "min";
  };
  /* Duração em SEGUNDOS entre início e fim (para o cronômetro), ou null se a tarefa não tem os dois horários. */
  L.duracaoSegundos = function (inicio, fim) {
    if (!inicio || !fim) return null;
    var m = L.minutos(fim) - L.minutos(inicio);
    return m > 0 ? m * 60 : null;
  };
  /* Dois horários se sobrepõem? Só vale quando os dois têm início e fim; encostar (um acaba quando o outro começa) não conta. */
  L.sobrepoe = function (aIni, aFim, bIni, bFim) {
    if (!aIni || !aFim || !bIni || !bFim) return false;
    return L.minutos(aIni) < L.minutos(bFim) && L.minutos(bIni) < L.minutos(aFim);
  };
  /* Tarefas do dia (ainda por fazer) que batem com este horário. */
  L.conflitos = function (itens, inicio, fim) {
    return itens.filter(function (i) { return !i.feita && L.sobrepoe(inicio, fim, i.inicio, i.fim); });
  };

  /* ---------- editar uma tarefa ---------- */
  /* Muda uma tarefa. "chave" é a do item (id da tarefa única ou "r:<id>" da rotina).
     campos: { texto, categoriaId, inicio, fim,  dia?, repete?: "nenhuma"|"semanal"|"diaria", diasSemana?: [0..6] }
       • sem "repete": mantém o tipo que a tarefa já tem;
       • "nenhuma" = só num dia (use "dia"); "semanal" = nos dias da semana escolhidos; "diaria" = todo dia;
       • trocar o tipo converte: única -> rotina (começa em "dia") ou rotina -> única (no "dia").
     Numa rotina que continua rotina, a mudança vale para todos os dias dela.
     Devolve { ok: true, chave } (a chave pode mudar se a tarefa foi convertida) ou { ok: false, erro }. Nada muda se der erro. */
  L.editarItem = function (dados, chave, campos, max) {
    var ehRotina = String(chave).indexOf("r:") === 0, id = ehRotina ? chave.slice(2) : chave;
    var alvo = (ehRotina ? dados.rotinas : dados.tarefas).filter(function (t) { return t.id === id; })[0];
    if (!alvo) return { ok: false, erro: "Essa tarefa não existe mais." };
    var texto = limparTexto(campos.texto, max);
    if (!texto) return { ok: false, erro: "A tarefa não pode ficar sem texto." };
    var h = L.validarHorario(campos.inicio, campos.fim);
    if (!h.ok) return { ok: false, erro: h.erro };
    var cat = campos.categoriaId && (dados.categorias || []).some(function (c) { return c.id === campos.categoriaId; }) ? campos.categoriaId : null;
    var extra = { categoriaId: cat, inicio: h.inicio, fim: h.fim };
    var antes = ehRotina ? alvo.tipo : "nenhuma";
    var repete = campos.repete === "diaria" || campos.repete === "semanal" || campos.repete === "nenhuma" ? campos.repete : antes;
    var dias = Array.isArray(campos.diasSemana) ? L.limparDias(campos.diasSemana) : (ehRotina ? alvo.diasSemana.slice() : []);
    if (repete === "semanal" && !dias.length) return { ok: false, erro: "Escolha pelo menos um dia da semana." };
    var dia = campos.dia || null, agora = campos.agora || Date.now();

    if (!ehRotina && repete === "nenhuma") {                    // única continua única (talvez em outro dia)
      alvo.texto = texto; alvo.categoriaId = extra.categoriaId; alvo.inicio = extra.inicio; alvo.fim = extra.fim;
      if (dia) alvo.dia = dia;
      return { ok: true, chave: alvo.id };
    }
    if (ehRotina && repete !== "nenhuma") {                     // rotina continua rotina (diária ou semanal)
      alvo.texto = texto; alvo.categoriaId = extra.categoriaId; alvo.inicio = extra.inicio; alvo.fim = extra.fim;
      alvo.tipo = repete; alvo.diasSemana = repete === "diaria" ? [0, 1, 2, 3, 4, 5, 6] : dias;
      if (dia) alvo.desde = dia;
      return { ok: true, chave: "r:" + alvo.id };
    }
    if (!ehRotina) {                                            // única vira rotina
      var nova = L.novaRotina(texto, repete, dias, dia || alvo.dia, agora, max, extra);
      if (!nova) return { ok: false, erro: "Não foi possível repetir esta tarefa." };
      nova.criadaEm = alvo.criadaEm;
      if (alvo.feitaEm) dados.feitas[L.chaveFeita(nova.id, alvo.dia)] = alvo.feitaEm;   // se já estava feita, continua feita naquele dia
      dados.tarefas = dados.tarefas.filter(function (t) { return t.id !== alvo.id; });
      dados.rotinas.push(nova);
      return { ok: true, chave: "r:" + nova.id };
    }
    if (!dia) return { ok: false, erro: "Escolha o dia da tarefa." };   // rotina vira única
    var unica = L.novaTarefa(texto, dia, agora, max, extra);
    unica.criadaEm = alvo.criadaEm;
    var feitaEm = dados.feitas[L.chaveFeita(alvo.id, dia)];
    if (feitaEm) unica.feitaEm = feitaEm;
    dados.rotinas = dados.rotinas.filter(function (r) { return r.id !== alvo.id; });
    dados.tarefas.push(unica);
    return { ok: true, chave: unica.id };
  };

  /* ---------- categorias ---------- */
  L.CORES_CATEGORIA = ["#3b6fd6", "#e8742c", "#7c5cd6", "#2fa56a", "#d9473f", "#d9a520", "#d9487d", "#1fa3a8"];
  L.categoriasPadrao = function () {
    return [
      { id: "c-trabalho", nome: "Trabalho", cor: "#3b6fd6" }, { id: "c-casa", nome: "Casa", cor: "#e8742c" },
      { id: "c-estudos", nome: "Estudos", cor: "#7c5cd6" }, { id: "c-tempo-livre", nome: "Tempo livre", cor: "#2fa56a" },
      { id: "c-compromissos", nome: "Compromissos", cor: "#d9473f" }, { id: "c-supermercado", nome: "Lista de supermercado", cor: "#d9a520" }
    ];
  };
  L.MAX_CATEGORIAS = 20;
  /* Nova categoria; devolve null se o nome estiver vazio ou já existir (sem acento/maiúscula). */
  L.novaCategoria = function (nome, cor, existentes, agora) {
    var n = L.nomeLimpo(nome).slice(0, 24);
    if (!n) return null;
    var chave = L.normalizarNome(n);
    if ((existentes || []).some(function (c) { return L.normalizarNome(c.nome) === chave; })) return null;
    return { id: "c" + agora.toString(36) + Math.random().toString(36).slice(2, 5), nome: n, cor: cor || L.CORES_CATEGORIA[(existentes || []).length % L.CORES_CATEGORIA.length] };
  };
  /* Apaga a categoria. As tarefas dela NÃO somem: ficam "sem categoria". */
  L.removerCategoria = function (dados, id) {
    dados.categorias = dados.categorias.filter(function (c) { return c.id !== id; });
    dados.tarefas.concat(dados.rotinas).forEach(function (t) { if (t.categoriaId === id) t.categoriaId = null; });
    return dados;
  };
  /* Separa os itens por categoria, na ordem das categorias da pessoa; "sem categoria" por último; só as que têm itens. */
  L.porCategoria = function (itens, categorias) {
    var grupos = [], semCat = [];
    categorias.forEach(function (c) {
      var lista = L.ordenar(itens.filter(function (i) { return i.categoriaId === c.id; }));
      if (lista.length) grupos.push({ categoria: c, itens: lista });
    });
    itens.forEach(function (i) { if (!categorias.some(function (c) { return c.id === i.categoriaId; })) semCat.push(i); });
    if (semCat.length) grupos.push({ categoria: null, itens: L.ordenar(semCat) });
    return grupos;
  };

  /* { total, feitas, pct } de uma lista de itens (ou de tarefas). */
  L.progresso = function (lista) {
    var feitas = lista.filter(function (t) { return t.feita || t.feitaEm; }).length;
    return { total: lista.length, feitas: feitas, pct: lista.length ? Math.round(feitas / lista.length * 100) : 0 };
  };

  /* Tarefas ÚNICAS de dias anteriores que ficaram sem fazer (rotinas não "acumulam"). */
  L.pendentesAntigas = function (tarefas, hoje) {
    return tarefas.filter(function (t) { return t.dia < hoje && !t.feitaEm; });
  };
  /* Leva tarefas (pelos ids) para hoje, lembrando de onde vieram. */
  L.trazerParaHoje = function (tarefas, ids, hoje) {
    tarefas.forEach(function (t) {
      if (ids.indexOf(t.id) !== -1 && t.dia < hoje && !t.feitaEm) { t.veioDe = t.dia; t.dia = hoje; }
    });
    return tarefas;
  };

  /* ---------- sequência ---------- */
  /* Dias em que alguma tarefa foi concluída (conjunto de "AAAA-MM-DD"), contando tarefas únicas e rotinas. */
  L.diasCumpridos = function (dados) {
    var dias = {};
    (dados.tarefas || []).forEach(function (t) { if (t.feitaEm) dias[L.diaDe(t.feitaEm)] = true; });
    Object.keys(dados.feitas || {}).forEach(function (k) { dias[L.diaDe(dados.feitas[k])] = true; });
    return dias;
  };
  /* Sequência atual: dias seguidos terminando hoje. Se hoje ainda não tem nada feito, conta a partir de ontem
     (a sequência só quebra quando o dia termina sem nenhuma tarefa). */
  L.sequencia = function (dados, hoje) {
    var dias = L.diasCumpridos(dados), cumpridoHoje = !!dias[hoje];
    var dia = cumpridoHoje ? hoje : L.somarDias(hoje, -1), n = 0;
    while (dias[dia]) { n++; dia = L.somarDias(dia, -1); }
    return { dias: n, cumpridoHoje: cumpridoHoje };
  };
  L.melhorSequencia = function (dados) {
    var lista = Object.keys(L.diasCumpridos(dados)).sort(), melhor = 0, atual = 0, anterior = null;
    lista.forEach(function (d) {
      atual = (anterior && L.somarDias(anterior, 1) === d) ? atual + 1 : 1;
      if (atual > melhor) melhor = atual;
      anterior = d;
    });
    return melhor;
  };

  /* ---------- pessoa (nome = login) ---------- */
  L.nomeLimpo = function (nome) { return String(nome == null ? "" : nome).replace(/\s+/g, " ").trim().slice(0, 30); };
  /* Sem acento, minúsculo, espaços simples: "  JOÃO   Silva " e "joao silva" são a mesma pessoa. */
  L.normalizarNome = function (nome) {
    return L.nomeLimpo(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  };
  /* Chave usada para guardar os dados dessa pessoa. */
  L.chavePerfil = function (nome) { return L.normalizarNome(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "perfil"; };

  /* Garante o formato atual (versão 2) em dados antigos ou incompletos. */
  L.migrar = function (dados, nome) {
    dados = dados && typeof dados === "object" ? dados : {};
    if (!Array.isArray(dados.tarefas)) dados.tarefas = [];
    if (!Array.isArray(dados.rotinas)) dados.rotinas = [];
    if (!dados.feitas || typeof dados.feitas !== "object") dados.feitas = {};
    if (dados.foco === undefined) dados.foco = null;
    if (!Array.isArray(dados.categorias)) dados.categorias = L.categoriasPadrao();
    if (dados.visao !== "categoria") dados.visao = "tipo";
    if (!dados.recolhidas || typeof dados.recolhidas !== "object") dados.recolhidas = {};   // categorias "encolhidas" na visão por categoria
    if (nome && !dados.nome) dados.nome = nome;
    dados.versao = 3;
    return dados;
  };

  /* ---------- textos ---------- */
  /* 300 -> "05:00"; 5400 -> "01:30:00" (com horas quando passa de 1 hora) */
  L.formatarTempo = function (segundos) {
    var s = Math.max(0, Math.round(segundos)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return (h ? dois(h) + ":" : "") + dois(m) + ":" + dois(s % 60);
  };
  /* "5 minutos", "1h30", "2h" a partir de segundos (para frases como "Tempo da tarefa: 1h30") */
  L.textoDuracao = function (segundos) {
    var m = Math.round(segundos / 60), h = Math.floor(m / 60), r = m % 60;
    return h ? h + "h" + (r ? dois(r) : "") : m + (m === 1 ? " minuto" : " minutos");
  };
  L.mensagem = function (p, minutos) {
    if (!p.total) return "Nada por aqui. Escreva a primeira tarefa, pequena já serve.";
    if (p.feitas === 0) return "Escolha UMA tarefa e comece por " + (minutos || 5) + " minutos.";
    if (p.feitas === p.total) return "Tudo feito! Bom trabalho.";
    if (p.pct >= 50) return "Mais da metade! Falta pouco.";
    return "Você já começou. É o passo mais difícil.";
  };

  if (typeof module !== "undefined" && module.exports) module.exports = L; else raiz.App.logica = L;
})(typeof window !== "undefined" ? window : { App: {} });
