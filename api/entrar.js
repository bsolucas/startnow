/* POST /api/entrar — confere nome e senha e devolve o crachá (token) da sessão. */
const { criarRotas, armazemPostgres } = require('./_nuvem');
module.exports = criarRotas(armazemPostgres).entrar;
