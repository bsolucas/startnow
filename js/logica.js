/* =============================================================================
   logica.js — REGRAS DO APP (sem tela, sem navegador: dá para testar no Node)
   -----------------------------------------------------------------------------
   Há dois tipos de tarefa:
     • ÚNICA (de um dia):  { id, texto, dia: "2026-10-28", criadaEm, feitaEm: ms|null, veioDe? }
     • ROTINA (que repete): { id, texto, tipo: "diaria" | "semanal", diasSemana: [0..6], desde: "2026-10-28", criadaEm }
       Cada vez que uma rotina é feita num dia, isso é guardado em  dados.feitas["<idDaRotina>|<dia>"] = horário.
   "dia" é sempre a data local, no formato AAAA-MM-DD. Dia da semana: 0 = domingo ... 6 = sábado.

   Dados completos de uma pessoa:
     { versao: 2, nome, tarefas: [], rotinas: [], feitas: {}, foco: null }

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
  L.novaTarefa = function (texto, dia, agora, max) {
    var t = limparTexto(texto, max); if (!t) return null;
    return { id: novoId("t", agora), texto: t, dia: dia, criadaEm: agora, feitaEm: null };
  };
  /* Tarefa que se repete. tipo "diaria" = todo dia; "semanal" = nos dias da semana informados (ex.: [2] = toda terça). */
  L.novaRotina = function (texto, tipo, diasSemana, desde, agora, max) {
    var t = limparTexto(texto, max); if (!t) return null;
    var dias = tipo === "diaria" ? [0, 1, 2, 3, 4, 5, 6] : (diasSemana || []).filter(function (d, i, a) { return d >= 0 && d <= 6 && a.indexOf(d) === i; }).sort();
    if (!dias.length) return null;
    return { id: novoId("r", agora), texto: t, tipo: tipo === "diaria" ? "diaria" : "semanal", diasSemana: dias, desde: desde, criadaEm: agora };
  };
  /* A rotina acontece neste dia? (só a partir do dia em que foi criada) */
  L.rotinaOcorre = function (rotina, dia) { return dia >= rotina.desde && rotina.diasSemana.indexOf(L.diaSemana(dia)) !== -1; };
  L.chaveFeita = function (rotinaId, dia) { return rotinaId + "|" + dia; };
  L.rotuloRepete = function (rotina) {
    if (rotina.tipo === "diaria") return "todo dia";
    return "toda " + rotina.diasSemana.map(function (d) { return L.DIAS_LONGOS[d]; }).join(" e ");
  };

  /* Tudo o que existe num dia, já separado em "únicas" e "rotinas". Cada item:
     { chave, tipo: "unica"|"rotina", texto, dia, feita, feitaEm, criadaEm, repete?, veioDe? }
     A "chave" da rotina é "r:<id>"; a da tarefa única é o próprio id. */
  L.itensDoDia = function (dados, dia) {
    var feitas = dados.feitas || {};
    var unicas = (dados.tarefas || []).filter(function (t) { return t.dia === dia; }).map(function (t) {
      return { chave: t.id, tipo: "unica", texto: t.texto, dia: dia, feita: !!t.feitaEm, feitaEm: t.feitaEm || null, criadaEm: t.criadaEm, veioDe: t.veioDe };
    });
    var rotinas = (dados.rotinas || []).filter(function (r) { return L.rotinaOcorre(r, dia); }).map(function (r) {
      var f = feitas[L.chaveFeita(r.id, dia)] || null;
      return { chave: "r:" + r.id, tipo: "rotina", rotinaId: r.id, texto: r.texto, dia: dia, feita: !!f, feitaEm: f, criadaEm: r.criadaEm, repete: L.rotuloRepete(r) };
    });
    return { unicas: unicas, rotinas: rotinas, todos: unicas.concat(rotinas) };
  };

  /* Lista na ordem da tela: as que faltam primeiro (na ordem de criação), as feitas no fim. Aceita itens ou tarefas. */
  L.ordenar = function (lista) {
    return lista.slice().sort(function (a, b) {
      var fa = (a.feita || a.feitaEm) ? 1 : 0, fb = (b.feita || b.feitaEm) ? 1 : 0;
      return fa - fb || a.criadaEm - b.criadaEm;
    });
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
    if (nome && !dados.nome) dados.nome = nome;
    dados.versao = 2;
    return dados;
  };

  /* ---------- textos ---------- */
  L.formatarTempo = function (segundos) { var s = Math.max(0, Math.round(segundos)); return dois(Math.floor(s / 60)) + ":" + dois(s % 60); };
  L.mensagem = function (p, minutos) {
    if (!p.total) return "Nada por aqui. Escreva a primeira tarefa, pequena já serve.";
    if (p.feitas === 0) return "Escolha UMA tarefa e comece por " + (minutos || 5) + " minutos.";
    if (p.feitas === p.total) return "Tudo feito! Bom trabalho.";
    if (p.pct >= 50) return "Mais da metade! Falta pouco.";
    return "Você já começou. É o passo mais difícil.";
  };

  if (typeof module !== "undefined" && module.exports) module.exports = L; else raiz.App.logica = L;
})(typeof window !== "undefined" ? window : { App: {} });
