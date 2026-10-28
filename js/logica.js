/* =============================================================================
   logica.js — REGRAS DO APP (sem tela, sem navegador: dá para testar no Node)
   -----------------------------------------------------------------------------
   Uma tarefa é um objeto simples:
     { id, texto, dia: "2026-10-28", criadaEm: <ms>, feitaEm: <ms> ou null, veioDe: "2026-10-27" (opcional) }
   "dia" é o dia da lista em que a tarefa está (data local, formato AAAA-MM-DD).

   Regra da sequência (dias seguidos): um dia conta quando pelo menos UMA tarefa foi
   concluída nele. A barra é baixa de propósito: o objetivo é começar, não fazer tudo.
   ============================================================================= */
(function (raiz) {
  var L = {};
  function dois(n) { return (n < 10 ? "0" : "") + n; }

  /* "2026-10-28" no fuso do aparelho (não em UTC, para o dia virar à meia-noite daqui). */
  L.diaDe = function (quando) {
    var d = quando instanceof Date ? quando : new Date(quando);
    return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate());
  };

  /* Soma (ou subtrai) dias. Usa meio-dia para o horário de verão não bagunçar a conta. */
  L.somarDias = function (dia, n) {
    var p = dia.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
    d.setDate(d.getDate() + n);
    return L.diaDe(d);
  };

  /* Cria uma tarefa nova. Devolve null se o texto estiver vazio. */
  L.novaTarefa = function (texto, dia, agora, max) {
    var t = String(texto == null ? "" : texto).replace(/\s+/g, " ").trim();
    if (!t) return null;
    t = t.slice(0, max || 140);
    return { id: "t" + agora.toString(36) + Math.random().toString(36).slice(2, 6), texto: t, dia: dia, criadaEm: agora, feitaEm: null };
  };

  L.tarefasDoDia = function (tarefas, dia) {
    return tarefas.filter(function (t) { return t.dia === dia; });
  };

  /* Lista na ordem em que aparece na tela: as que faltam primeiro (na ordem em que foram criadas), as feitas no fim. */
  L.ordenar = function (lista) {
    return lista.slice().sort(function (a, b) {
      var fa = a.feitaEm ? 1 : 0, fb = b.feitaEm ? 1 : 0;
      return fa - fb || a.criadaEm - b.criadaEm;
    });
  };

  /* { total, feitas, pct } de uma lista de tarefas. */
  L.progresso = function (lista) {
    var feitas = lista.filter(function (t) { return t.feitaEm; }).length;
    return { total: lista.length, feitas: feitas, pct: lista.length ? Math.round(feitas / lista.length * 100) : 0 };
  };

  /* Tarefas de dias anteriores que ficaram sem fazer (para oferecer "trazer para hoje"). */
  L.pendentesAntigas = function (tarefas, hoje) {
    return tarefas.filter(function (t) { return t.dia < hoje && !t.feitaEm; });
  };

  /* Leva tarefas (pelos ids) para o dia de hoje, lembrando de onde vieram. */
  L.trazerParaHoje = function (tarefas, ids, hoje) {
    tarefas.forEach(function (t) {
      if (ids.indexOf(t.id) !== -1 && t.dia < hoje && !t.feitaEm) { t.veioDe = t.dia; t.dia = hoje; }
    });
    return tarefas;
  };

  /* Dias em que alguma tarefa foi concluída (conjunto de "AAAA-MM-DD"). */
  L.diasCumpridos = function (tarefas) {
    var dias = {};
    tarefas.forEach(function (t) { if (t.feitaEm) dias[L.diaDe(t.feitaEm)] = true; });
    return dias;
  };

  /* Sequência atual: dias seguidos terminando hoje. Se hoje ainda não tem nada feito, conta a partir de ontem
     (a sequência só quebra quando o dia termina sem nenhuma tarefa). */
  L.sequencia = function (tarefas, hoje) {
    var dias = L.diasCumpridos(tarefas);
    var cumpridoHoje = !!dias[hoje];
    var dia = cumpridoHoje ? hoje : L.somarDias(hoje, -1);
    var n = 0;
    while (dias[dia]) { n++; dia = L.somarDias(dia, -1); }
    return { dias: n, cumpridoHoje: cumpridoHoje };
  };

  /* Maior sequência de todos os tempos. */
  L.melhorSequencia = function (tarefas) {
    var lista = Object.keys(L.diasCumpridos(tarefas)).sort();
    var melhor = 0, atual = 0, anterior = null;
    lista.forEach(function (d) {
      atual = (anterior && L.somarDias(anterior, 1) === d) ? atual + 1 : 1;
      if (atual > melhor) melhor = atual;
      anterior = d;
    });
    return melhor;
  };

  /* 300 -> "05:00" */
  L.formatarTempo = function (segundos) {
    var s = Math.max(0, Math.round(segundos));
    return dois(Math.floor(s / 60)) + ":" + dois(s % 60);
  };

  /* Frase de incentivo conforme o andamento do dia. */
  L.mensagem = function (p, minutos) {
    if (!p.total) return "Escreva a primeira tarefa. Pequena já serve.";
    if (p.feitas === 0) return "Escolha UMA tarefa e comece por " + (minutos || 5) + " minutos.";
    if (p.feitas === p.total) return "Dia fechado! Tudo feito por hoje.";
    if (p.pct >= 50) return "Mais da metade! Falta pouco.";
    return "Você já começou. É o passo mais difícil.";
  };

  if (typeof module !== "undefined" && module.exports) module.exports = L; else raiz.App.logica = L;
})(typeof window !== "undefined" ? window : { App: {} });
