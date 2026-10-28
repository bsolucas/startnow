/* =============================================================================
   config.js — NOME E AJUSTES DO APP (carregado primeiro)
   -----------------------------------------------------------------------------
   Tudo que dá para mudar sem mexer na lógica fica aqui.
   ============================================================================= */
var App = window.App || {};
window.App = App;

App.config = {
  NOME_APP: "StartNow",
  PREFIXO_ARMAZENAMENTO: "startnow-",   // nome das chaves guardadas no navegador
  MINUTOS_FOCO: 5,                       // o cronômetro "Começar agora": só 5 minutos, o resto vem depois
  MAX_TEXTO_TAREFA: 140                  // tamanho máximo do texto de uma tarefa
};
