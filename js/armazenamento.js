/* =============================================================================
   armazenamento.js — ONDE OS DADOS FICAM GUARDADOS
   -----------------------------------------------------------------------------
   Hoje: no próprio aparelho (localStorage do navegador). Todo o resto do app só usa
   ler() e gravar(), então trocar por Supabase (login + nuvem) depois mexe só neste arquivo.
   Formato:  { versao: 1, tarefas: [...], foco: { tarefaId, fimEm, duracao } ou null }
   ============================================================================= */
App.armazenamento = (function () {
  var chave = App.config.PREFIXO_ARMAZENAMENTO + "dados";
  var memoria = null;   // cópia na memória: se o navegador não deixar gravar, o app ainda funciona até fechar

  function vazio() { return { versao: 1, tarefas: [], foco: null }; }

  /* Lê do navegador (de novo). Use ao voltar para o app, caso outra aba tenha mudado alguma coisa. */
  function recarregar() {
    try {
      var j = JSON.parse(localStorage.getItem(chave));
      if (j && Array.isArray(j.tarefas)) { memoria = j; return j; }
    } catch (e) { /* sem armazenamento ou dado quebrado */ }
    return memoria || (memoria = vazio());
  }
  /* Devolve SEMPRE o mesmo objeto: a tela e o cronômetro mexem na mesma cópia, então um não
     desfaz o que o outro gravou. */
  function ler() { return memoria || recarregar(); }
  function gravar(dados) {
    memoria = dados;
    try { localStorage.setItem(chave, JSON.stringify(dados)); } catch (e) { /* modo privado: segue só na memória */ }
  }
  return { ler: ler, recarregar: recarregar, gravar: gravar };
})();
