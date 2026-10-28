// Testes das contas de cor (rode com:  node --test test/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/tema.js');

test('normalizarHex aceita 3 ou 6 dígitos, com ou sem #, e recusa o resto', () => {
  assert.equal(T.normalizarHex('#3B6FD6'), '#3b6fd6');
  assert.equal(T.normalizarHex('  3b6fd6 '), '#3b6fd6');
  assert.equal(T.normalizarHex('#abc'), '#aabbcc');
  assert.equal(T.normalizarHex('F0A'), '#ff00aa');
  for (const ruim of ['', null, undefined, '#12', '#12345', '#1234567', 'azul', '#gggggg', '##123456']) assert.equal(T.normalizarHex(ruim), null, String(ruim));
});

test('conversões de cor vão e voltam sem perder a cor', () => {
  for (const hex of ['#000000', '#ffffff', '#3b6fd6', '#d9a520', '#2fa56a', '#7c5cd6', '#ff0000']) {
    const volta = T.rgbParaHex(T.hslParaRgb(T.rgbParaHsl(T.hexParaRgb(hex))));
    assert.equal(volta, hex);
  }
  assert.deepEqual(T.hexParaRgb('#102030'), [16, 32, 48]);
});

test('contraste: preto no branco é 21 e cores iguais é 1', () => {
  assert.equal(Math.round(T.contraste('#000000', '#ffffff')), 21);
  assert.equal(T.contraste('#3b6fd6', '#3b6fd6'), 1);
});

test('toda cor sugerida fica legível nos dois temas (texto colorido e texto sobre o botão)', () => {
  for (const { nome, cor } of T.PRESETS) {
    for (const [tema, fundo] of [['escuro', '#101218'], ['claro', '#ffffff']]) {
      const d = T.derivar(cor, tema);
      assert.ok(T.contraste(d.texto, fundo) >= 4.5, `${nome}/${tema}: texto colorido ${d.texto} sobre ${fundo} = ${T.contraste(d.texto, fundo).toFixed(2)}`);
      assert.ok(T.contraste(d.sobre, d.destaque) >= 4, `${nome}/${tema}: texto do botão ${d.sobre} sobre ${d.destaque} = ${T.contraste(d.sobre, d.destaque).toFixed(2)}`);
    }
  }
});

test('cores extremas (preto, branco, amarelo puro) também ficam legíveis', () => {
  for (const cor of ['#000000', '#ffffff', '#ffff00', '#00ffff', '#808080']) {
    for (const [tema, fundo] of [['escuro', '#101218'], ['claro', '#ffffff']]) {
      const d = T.derivar(cor, tema);
      assert.ok(T.contraste(d.texto, fundo) >= 4.5, `${cor}/${tema} texto`);
      assert.ok(T.contraste(d.sobre, d.destaque) >= 4, `${cor}/${tema} botão`);
    }
  }
});

test('derivar: variações coerentes (escuro mais escuro, claro mais claro) e cor inválida volta ao padrão', () => {
  const d = T.derivar('#3b6fd6', 'escuro');
  const luz = (h) => T.rgbParaHsl(T.hexParaRgb(h))[2];
  assert.ok(luz(d.escuro) < luz(d.destaque) && luz(d.destaque) < luz(d.claro));
  assert.equal(d.suave, 'rgba(59, 111, 214, 0.16)');
  assert.equal(T.derivar('lixo', 'escuro').destaque, T.PADRAO.cor);
  assert.equal(T.derivar('#d9a520', 'escuro').sobre, '#10131a');   // amarelo pede texto escuro
  assert.equal(T.derivar('#3b6fd6', 'escuro').sobre, '#ffffff');   // azul pede texto branco
});
