/* =============================================================================
   armazenamento.js — ONDE OS DADOS FICAM GUARDADOS (por pessoa)
   -----------------------------------------------------------------------------
   Hoje: no próprio aparelho (localStorage do navegador), sem banco de dados e sem internet.
   Cada pessoa tem o seu espaço: o NOME dela é o login. Chaves usadas:
     startnow-perfis        lista de pessoas deste aparelho: [{ nome, chave }]
     startnow-sessao        quem está "conectado" neste aparelho: { chave }
     startnow-dados-<chave> as tarefas dessa pessoa (formato em js/logica.js)
   O resto do app só usa criar / entrar / sair / ler / gravar. Trocar por Supabase (login + nuvem)
   no futuro mexe só neste arquivo.
   ============================================================================= */
App.armazenamento = (function () {
  var L = App.logica, P = App.config.PREFIXO_ARMAZENAMENTO;
  var K_PERFIS = P + "perfis", K_SESSAO = P + "sessao";
  var LEGADO = [P + "dados", "comecaja-dados"];   // versões antigas (uma pessoa só): adotadas por quem criar o 1º perfil
  var atual = null;      // { nome, chave } de quem está usando agora
  var memoria = null;    // os dados da pessoa atual (SEMPRE o mesmo objeto: tela e cronômetro mexem na mesma cópia)
  var reserva = {};      // se o navegador não deixar gravar (modo privado), tudo segue só na memória

  function lerJSON(k) { try { var v = localStorage.getItem(k); return v === null ? (reserva[k] === undefined ? null : reserva[k]) : JSON.parse(v); } catch (e) { return reserva[k] === undefined ? null : reserva[k]; } }
  function gravarJSON(k, v) { reserva[k] = v; try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* segue na memória */ } }

  function perfis() { var l = lerJSON(K_PERFIS); return Array.isArray(l) ? l : []; }
  function achar(nome) { var c = L.chavePerfil(nome); return perfis().filter(function (p) { return p.chave === c; })[0] || null; }
  function chaveDados(chave) { return P + "dados-" + chave; }

  /* Cria a pessoa. Se for a primeira e houver dados de uma versão antiga, eles passam a ser dela. */
  function criar(nome) {
    nome = L.nomeLimpo(nome);
    if (!nome) return null;
    var existente = achar(nome);
    if (existente) return existente;
    var lista = perfis(), perfil = { nome: nome, chave: L.chavePerfil(nome) }, dados = null;
    if (!lista.length) {
      LEGADO.forEach(function (k) { if (!dados) { var v = lerJSON(k); if (v && Array.isArray(v.tarefas)) { dados = v; gravarJSON(k, null); } } });
    }
    lista.push(perfil); gravarJSON(K_PERFIS, lista);
    gravarJSON(chaveDados(perfil.chave), L.migrar(dados, nome));
    return perfil;
  }

  /* Entra como essa pessoa. lembrar = continuar conectado neste aparelho. */
  function entrar(chave, lembrar) {
    var perfil = perfis().filter(function (p) { return p.chave === chave; })[0];
    if (!perfil) return false;
    atual = perfil; memoria = null;
    gravarJSON(K_SESSAO, lembrar === false ? null : { chave: chave });
    recarregar();
    return true;
  }
  function sair() { atual = null; memoria = null; gravarJSON(K_SESSAO, null); }
  /* Quem ficou conectado da última vez (ou null). */
  function sessaoSalva() { var s = lerJSON(K_SESSAO); return s && s.chave ? perfis().filter(function (p) { return p.chave === s.chave; })[0] || null : null; }

  /* Lê do navegador (de novo). Use ao voltar para o app, caso outra aba tenha mudado alguma coisa. */
  function recarregar() {
    if (!atual) return null;
    memoria = L.migrar(lerJSON(chaveDados(atual.chave)), atual.nome);
    return memoria;
  }
  function ler() { return memoria || recarregar(); }
  function gravar(dados) { if (!atual) return; memoria = dados; gravarJSON(chaveDados(atual.chave), dados); }

  return {
    perfis: perfis, achar: achar, criar: criar, entrar: entrar, sair: sair, sessaoSalva: sessaoSalva,
    atual: function () { return atual; }, ler: ler, recarregar: recarregar, gravar: gravar
  };
})();
