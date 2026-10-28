'use strict';
const test = require('node:test');
const assert = require('node:assert');
const N = require('../api/_nuvem.js');

function falso(metodo, corpo, cab) {
  const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(t) { this.texto = t; } };
  return { req: { method: metodo, body: corpo, headers: cab || {} }, res, json: () => JSON.parse(res.texto) };
}
async function chamar(rota, metodo, corpo, cab) { const f = falso(metodo, corpo, cab); await rota(f.req, f.res); return { status: f.res.statusCode, ...f.json() }; }
const dadosOk = () => ({ versao: 3, nome: 'Maria', tarefas: [], rotinas: [], feitas: {}, categorias: [] });

async function montar() {
  const arm = N.armazemMemoria();
  const { sal, hash } = await N.novaSenha('Segredo9');
  arm._usuarios['maria'] = { chave: 'maria', nome: 'Maria', sal, hash };
  return N.criarRotas(() => arm, { forcarLigada: true });
}

test('entrar: senha certa devolve crachá; errada, 401', async () => {
  const r = await montar();
  const ok = await chamar(r.entrar, 'POST', { nome: 'MARIA', senha: 'Segredo9' });
  assert.equal(ok.status, 200); assert.ok(ok.token); assert.equal(ok.nome, 'Maria');
  assert.equal((await chamar(r.entrar, 'POST', { nome: 'Maria', senha: 'errada' })).status, 401);
  assert.equal((await chamar(r.entrar, 'POST', { nome: 'Ninguem', senha: 'x' })).status, 401);
  assert.equal((await chamar(r.entrar, 'GET', {})).status, 405);
});

test('entrar: bloqueia depois de 8 erros seguidos', async () => {
  const r = await montar();
  for (let i = 0; i < 8; i++) await chamar(r.entrar, 'POST', { nome: 'Maria', senha: 'x' + i });
  assert.equal((await chamar(r.entrar, 'POST', { nome: 'Maria', senha: 'Segredo9' })).status, 429);
});

test('dados: sem crachá ou com crachá adulterado, 401', async () => {
  const r = await montar();
  assert.equal((await chamar(r.dados, 'GET')).status, 401);
  const { token } = await chamar(r.entrar, 'POST', { nome: 'Maria', senha: 'Segredo9' });
  assert.equal((await chamar(r.dados, 'GET', null, { authorization: 'Bearer ' + token.slice(0, -2) + 'xx' })).status, 401);
  assert.equal((await chamar(r.dados, 'GET', null, { authorization: 'Bearer ' + N.assinar({ u: 'maria', n: 'M', exp: Date.now() - 1000 }) })).status, 401);
});

test('dados: grava, lê e detecta conflito de versão', async () => {
  const r = await montar();
  const { token } = await chamar(r.entrar, 'POST', { nome: 'Maria', senha: 'Segredo9' });
  const a = { authorization: 'Bearer ' + token };
  assert.deepEqual((await chamar(r.dados, 'GET', null, a)).dados, null);
  const p1 = await chamar(r.dados, 'PUT', { dados: dadosOk(), versao: 0 }, a);
  assert.equal(p1.status, 200); assert.equal(p1.versao, 1);
  const p2 = await chamar(r.dados, 'PUT', { dados: dadosOk(), versao: 1 }, a);
  assert.equal(p2.versao, 2);
  const velho = await chamar(r.dados, 'PUT', { dados: dadosOk(), versao: 1 }, a);
  assert.equal(velho.status, 409); assert.equal(velho.versao, 2); assert.ok(velho.dados);
  assert.equal((await chamar(r.dados, 'PUT', { dados: { lixo: 1 }, versao: 2 }, a)).status, 400);
});

test('cada pessoa só enxerga os próprios dados', async () => {
  const arm = N.armazemMemoria();
  for (const n of ['Ana', 'Bia']) { const s = await N.novaSenha('pw-' + n); arm._usuarios[n.toLowerCase()] = { chave: n.toLowerCase(), nome: n, ...s }; }
  const r = N.criarRotas(() => arm, { forcarLigada: true });
  const ta = (await chamar(r.entrar, 'POST', { nome: 'Ana', senha: 'pw-Ana' })).token;
  const tb = (await chamar(r.entrar, 'POST', { nome: 'Bia', senha: 'pw-Bia' })).token;
  await chamar(r.dados, 'PUT', { dados: { ...dadosOk(), nome: 'Ana' }, versao: 0 }, { authorization: 'Bearer ' + ta });
  assert.equal((await chamar(r.dados, 'GET', null, { authorization: 'Bearer ' + tb })).dados, null);
});

test('estado: informa se a nuvem está ligada', async () => {
  const r = N.criarRotas(() => N.armazemMemoria(), { forcarLigada: true });
  assert.equal((await chamar(r.estado, 'GET')).nuvem, true);
});
