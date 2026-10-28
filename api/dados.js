/* GET/PUT /api/dados — lê e grava a lista da pessoa conectada (precisa do crachá). */
const { criarRotas, armazemPostgres } = require('./_nuvem');
module.exports = criarRotas(armazemPostgres).dados;
