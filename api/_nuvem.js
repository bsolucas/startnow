/* =============================================================================
   api/_nuvem.js — LOGIN E DADOS NA NUVEM (lógica das funções da pasta api/)
   -----------------------------------------------------------------------------
   O arquivo começa com "_" para a Vercel NÃO tratá-lo como uma rota. Ele tem:
     • sessão: um "crachá" (token) assinado com um segredo que só o servidor conhece;
     • senha: guardada só como hash (scrypt) + sal, nunca em texto;
     • limite de tentativas de login (8 erros a cada 5 minutos por pessoa + endereço);
     • os "armazéns": o de verdade (Postgres da Vercel/Neon) e um em memória, usado nos testes.
   As rotas (api/estado.js, api/entrar.js, api/dados.js) só chamam as funções daqui.
   Não existe cadastro pela internet: a pessoa é criada uma vez por mim, direto no banco.
   ============================================================================= */
'use strict';
const crypto = require('crypto');
const L = require('../js/logica.js');   // mesmas regras de nome do app (sem acento/maiúscula)

const MAX_CORPO = 300 * 1024;            // uma lista grande tem poucos KB
const DIAS_SESSAO = 30;
const TENTATIVAS_MAX = 8, JANELA_MS = 5 * 60 * 1000;

const urlBanco = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_DATABASE_URL || process.env.DATABASE_URL_POSTGRES_URL || '';   // a Vercel pode pôr um prefixo no nome
const segredo = () => process.env.SESSAO_SEGREDO || crypto.createHash('sha256').update('startnow-sessao|' + urlBanco()).digest('hex');
const b64 = (t) => Buffer.from(t).toString('base64url');
const mac = (corpo) => crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url');

function assinar(payload) { const c = b64(JSON.stringify(payload)); return c + '.' + mac(c); }
function verificar(token) {
  if (typeof token !== 'string') return null;
  const [c, m] = token.split('.');
  if (!c || !m) return null;
  const a = Buffer.from(m), b = Buffer.from(mac(c));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(c, 'base64url').toString('utf8')); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
const scrypt = (senha, salHex) => new Promise((ok, no) => crypto.scrypt(String(senha), Buffer.from(salHex, 'hex'), 64, (e, k) => e ? no(e) : ok(k.toString('hex'))));
async function senhaConfere(senha, salHex, hashHex) {
  const a = Buffer.from(await scrypt(senha, salHex), 'hex'), b = Buffer.from(hashHex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
/* Para criar uma pessoa (uso interno, feito uma vez): devolve { sal, hash } em hexadecimal. */
async function novaSenha(senha) { const sal = crypto.randomBytes(16).toString('hex'); return { sal, hash: await scrypt(senha, sal) }; }

function responder(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function corpoDe(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  try { return b ? JSON.parse(b) : {}; } catch (e) { return {}; }
}
/* Confere o formato do que o app manda gravar (evita lixo e abuso; não é antifraude). */
function dadosValidos(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
  if (!Array.isArray(d.tarefas) || !Array.isArray(d.rotinas) || d.tarefas.length > 5000 || d.rotinas.length > 500) return false;
  if (!d.feitas || typeof d.feitas !== 'object' || Array.isArray(d.feitas) || Object.keys(d.feitas).length > 100000) return false;
  if (!Array.isArray(d.categorias) || d.categorias.length > 40) return false;
  return JSON.stringify(d).length <= MAX_CORPO;
}

/* ---------- armazém de verdade: Postgres (Neon) ---------- */
function armazemPostgres() {
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(urlBanco());
  return {
    async preparar() {
      await sql`CREATE TABLE IF NOT EXISTS startnow_usuarios (chave text PRIMARY KEY, nome text NOT NULL, sal text NOT NULL, hash text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS startnow_dados (usuario text PRIMARY KEY REFERENCES startnow_usuarios(chave) ON DELETE CASCADE, versao integer NOT NULL, dados jsonb NOT NULL, atualizado_em timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS startnow_falhas (chave text NOT NULL, em timestamptz NOT NULL DEFAULT now())`;
    },
    async usuario(chave) { const r = await sql`SELECT chave, nome, sal, hash FROM startnow_usuarios WHERE chave = ${chave}`; return r[0] || null; },
    async falhas(chave) { const r = await sql`SELECT count(*)::int AS n FROM startnow_falhas WHERE chave = ${chave} AND em > now() - interval '5 minutes'`; return r[0].n; },
    async registrarFalha(chave) { await sql`INSERT INTO startnow_falhas (chave) VALUES (${chave})`; await sql`DELETE FROM startnow_falhas WHERE em < now() - interval '1 day'`; },
    async limparFalhas(chave) { await sql`DELETE FROM startnow_falhas WHERE chave = ${chave}`; },
    async lerDados(chave) { const r = await sql`SELECT versao, dados FROM startnow_dados WHERE usuario = ${chave}`; return r[0] ? { versao: r[0].versao, dados: r[0].dados } : { versao: 0, dados: null }; },
    /* Grava só se a versão que o app conhece ainda é a do servidor (senão devolve o que está lá). */
    async salvarDados(chave, dados, esperada) {
      const json = JSON.stringify(dados);
      if (esperada === 0) {
        const r = await sql`INSERT INTO startnow_dados (usuario, versao, dados) VALUES (${chave}, 1, ${json}::jsonb) ON CONFLICT (usuario) DO NOTHING RETURNING versao`;
        if (r.length) return { ok: true, versao: r[0].versao };
      } else {
        const r = await sql`UPDATE startnow_dados SET versao = versao + 1, dados = ${json}::jsonb, atualizado_em = now() WHERE usuario = ${chave} AND versao = ${esperada} RETURNING versao`;
        if (r.length) return { ok: true, versao: r[0].versao };
      }
      const atual = await this.lerDados(chave);
      return { ok: false, versao: atual.versao, dados: atual.dados };
    }
  };
}

/* ---------- armazém em memória (testes e simulação local) ---------- */
function armazemMemoria() {
  const usuarios = {}, dados = {}, falhas = {};
  return {
    _usuarios: usuarios, _dados: dados,
    async preparar() {},
    async usuario(chave) { return usuarios[chave] || null; },
    async falhas(chave) { return (falhas[chave] || []).filter((t) => Date.now() - t < JANELA_MS).length; },
    async registrarFalha(chave) { (falhas[chave] = falhas[chave] || []).push(Date.now()); },
    async limparFalhas(chave) { delete falhas[chave]; },
    async lerDados(chave) { return dados[chave] ? { versao: dados[chave].versao, dados: JSON.parse(JSON.stringify(dados[chave].dados)) } : { versao: 0, dados: null }; },
    async salvarDados(chave, d, esperada) {
      const atual = dados[chave];
      if ((atual ? atual.versao : 0) === esperada) { dados[chave] = { versao: esperada + 1, dados: JSON.parse(JSON.stringify(d)) }; return { ok: true, versao: esperada + 1 }; }
      return { ok: false, versao: atual ? atual.versao : 0, dados: atual ? JSON.parse(JSON.stringify(atual.dados)) : null };
    }
  };
}

/* ---------- as três rotas ---------- */
function criarRotas(obterArmazem, opcoes) {
  opcoes = opcoes || {};
  let pronto = null;
  const armazem = () => { const a = obterArmazem(); if (!pronto) pronto = a.preparar().catch((e) => { pronto = null; throw e; }); return pronto.then(() => a); };
  const nuvemLigada = () => opcoes.forcarLigada || !!urlBanco();

  /* GET /api/estado: a nuvem está configurada? (o app usa isso para saber se pede senha) */
  async function estado(req, res) { responder(res, 200, { nuvem: nuvemLigada() }); }

  /* POST /api/entrar { nome, senha } -> { token, nome } */
  async function entrar(req, res) {
    if (req.method !== 'POST') return responder(res, 405, { erro: 'Método não permitido.' });
    if (!nuvemLigada()) return responder(res, 503, { erro: 'A nuvem ainda não está configurada.' });
    const { nome, senha } = corpoDe(req);
    const chave = L.chavePerfil(nome);
    if (!L.nomeLimpo(nome) || typeof senha !== 'string' || !senha || senha.length > 200) return responder(res, 400, { erro: 'Digite o nome e a senha.' });
    try {
      const a = await armazem();
      const ip = String((req.headers && (req.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'sem-ip';
      const limite = ip + '|' + chave;
      if (await a.falhas(limite) >= TENTATIVAS_MAX) return responder(res, 429, { erro: 'Muitas tentativas. Espere alguns minutos.' });
      const u = await a.usuario(chave);
      const ok = u ? await senhaConfere(senha, u.sal, u.hash) : (await scrypt(senha, '00'.repeat(16)), false);   // gasta o mesmo tempo mesmo se a pessoa não existir
      if (!ok) { await a.registrarFalha(limite); return responder(res, 401, { erro: 'Nome ou senha incorretos.' }); }
      await a.limparFalhas(limite);
      responder(res, 200, { token: assinar({ u: u.chave, n: u.nome, exp: Date.now() + DIAS_SESSAO * 86400000 }), nome: u.nome });
    } catch (e) { responder(res, 500, { erro: 'Erro no servidor.' }); }
  }

  /* GET /api/dados -> { versao, dados } ;  PUT /api/dados { dados, versao } -> { versao } ou 409 { versao, dados } */
  async function dados(req, res) {
    const sessao = verificar(String((req.headers && req.headers.authorization) || '').replace(/^Bearer\s+/i, ''));
    if (!sessao) return responder(res, 401, { erro: 'Sessão expirada. Entre de novo.' });
    try {
      const a = await armazem();
      if (req.method === 'GET') return responder(res, 200, await a.lerDados(sessao.u));
      if (req.method === 'PUT') {
        const { dados: novos, versao } = corpoDe(req);
        if (!dadosValidos(novos) || !Number.isInteger(versao) || versao < 0) return responder(res, 400, { erro: 'Dados inválidos.' });
        const r = await a.salvarDados(sessao.u, novos, versao);
        return r.ok ? responder(res, 200, { versao: r.versao }) : responder(res, 409, { erro: 'Os dados foram alterados em outro lugar.', versao: r.versao, dados: r.dados });
      }
      responder(res, 405, { erro: 'Método não permitido.' });
    } catch (e) { responder(res, 500, { erro: 'Erro no servidor.' }); }
  }
  return { estado, entrar, dados };
}

module.exports = { criarRotas, armazemPostgres, armazemMemoria, assinar, verificar, novaSenha, senhaConfere, dadosValidos, MAX_CORPO };
