/* GET /api/estado — diz se a nuvem está configurada (o app só pede senha quando está). */
const { criarRotas, armazemPostgres } = require('./_nuvem');
module.exports = criarRotas(armazemPostgres).estado;
