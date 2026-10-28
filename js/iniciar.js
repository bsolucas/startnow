/* =============================================================================
   iniciar.js — PONTO DE PARTIDA (carregado por último)
   -----------------------------------------------------------------------------
   Decide o que mostrar ao abrir: se já há uma pessoa conectada neste aparelho, vai direto para a tela
   principal; senão, pergunta o nome ("Oi, digite seu nome"). Pessoa nova passa por "Criar lista de tarefas".
   ============================================================================= */
document.title = App.config.NOME_APP;
App.perfil.iniciar(function (criarLista) {
  if (criarLista) App.perfil.mostrarCriarLista(function () { App.hoje.abrir(); });
  else App.hoje.abrir();
});
