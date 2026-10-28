/* =============================================================================
   nuvem.js — LOGIN E SINCRONIZAÇÃO COM A NUVEM (funções da pasta api/)
   -----------------------------------------------------------------------------
   Só entra em ação se o servidor disser que a nuvem está configurada (GET /api/estado).
   Sem nuvem, o app continua 100% local, como antes.
   Guarda neste aparelho (startnow-nuvem): { token, nome, versao, pendente }
     token     crachá da sessão (vale 30 dias)
     versao    versão dos dados no servidor que este aparelho conhece
     pendente  true = há mudanças aqui que ainda não subiram (ficou sem internet)
   Regra de conflito (uma pessoa, vários aparelhos): vence a última gravação.
   ============================================================================= */
App.nuvem = (function () {
  var K = App.config.PREFIXO_ARMAZENAMENTO + "nuvem";
  var ligada = null, fila = null, enviando = false, reserva = null;

  function ler() { try { var v = JSON.parse(localStorage.getItem(K)); return v && v.token ? v : reserva; } catch (e) { return reserva; } }
  function guardar(v) { reserva = v; try { if (v) localStorage.setItem(K, JSON.stringify(v)); else localStorage.removeItem(K); } catch (e) { /* segue na memória */ } }

  function pedir(metodo, url, corpo, token, ms) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, ms || 8000);
    var cab = { "Content-Type": "application/json" };
    if (token) cab.Authorization = "Bearer " + token;
    return fetch(url, { method: metodo, headers: cab, body: corpo ? JSON.stringify(corpo) : undefined, signal: ctl ? ctl.signal : undefined, cache: "no-store" })
      .then(function (r) { clearTimeout(t); return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }

  /* A nuvem está configurada? (resposta guardada; offline = false) */
  function disponivel() {
    if (ligada !== null) return Promise.resolve(ligada);
    return pedir("GET", "api/estado", null, null, 4000).then(function (j) { return (ligada = j.status === 200 && j.nuvem === true); }, function () { return !!ler(); });
  }
  function conectado() { return !!ler(); }
  function nome() { var s = ler(); return s ? s.nome : ""; }

  /* Confere nome e senha. Devolve { ok, erro? }. */
  function entrar(nomeDigitado, senha) {
    return pedir("POST", "api/entrar", { nome: nomeDigitado, senha: senha }).then(function (j) {
      if (j.status !== 200) return { ok: false, erro: j.erro || "Não foi possível entrar." };
      guardar({ token: j.token, nome: j.nome, versao: 0, pendente: false });
      return { ok: true, nome: j.nome };
    }, function () { return { ok: false, erro: "Sem conexão com a internet." }; });
  }
  function sair() { clearTimeout(fila); fila = null; guardar(null); }

  /* Traz os dados da nuvem. Devolve { dados | null, falhou? }. Se há mudanças locais pendentes, sobe as locais. */
  function baixar() {
    var s = ler();
    if (!s) return Promise.resolve({ dados: null, falhou: true });
    return pedir("GET", "api/dados", null, s.token).then(function (j) {
      if (j.status === 401) { guardar(null); return { dados: null, falhou: true, expirou: true }; }
      if (j.status !== 200) return { dados: null, falhou: true };
      s.versao = j.versao; guardar(s);
      return { dados: j.dados, versao: j.versao, pendente: !!s.pendente };
    }, function () { return { dados: null, falhou: true }; });
  }

  /* Pede para subir os dados (junta várias gravações seguidas numa só). */
  function agendar(obterDados) {
    var s = ler(); if (!s) return;
    s.pendente = true; guardar(s);
    clearTimeout(fila);
    fila = setTimeout(function () { subir(obterDados); }, 900);
  }
  function subir(obterDados, repetiu) {
    var s = ler(); if (!s || enviando) { if (s && enviando) fila = setTimeout(function () { subir(obterDados); }, 1500); return Promise.resolve(); }
    enviando = true;
    return pedir("PUT", "api/dados", { dados: obterDados(), versao: s.versao }, s.token).then(function (j) {
      enviando = false;
      var atual = ler(); if (!atual) return;
      if (j.status === 200) { atual.versao = j.versao; atual.pendente = false; guardar(atual); }
      else if (j.status === 409 && !repetiu) { atual.versao = j.versao; guardar(atual); return subir(obterDados, true); }   // vence a última gravação
      else if (j.status === 401) guardar(null);
    }, function () { enviando = false; /* sem internet: continua pendente e tenta na próxima gravação */ });
  }
  /* Ao voltar a ter internet, sobe o que ficou pendente. */
  function tentarPendente(obterDados) { var s = ler(); if (s && s.pendente) subir(obterDados); }

  return { disponivel: disponivel, conectado: conectado, nome: nome, entrar: entrar, sair: sair, baixar: baixar, agendar: agendar, tentarPendente: tentarPendente };
})();
