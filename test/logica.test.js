// Testes da lógica (rode com:  node --test test/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logica.js');

const ms = (dia, hora = 12) => { const [a, m, d] = dia.split('-').map(Number); return new Date(a, m - 1, d, hora, 0, 0).getTime(); };
const tarefa = (id, dia, feitaDia, criada = 1) => ({ id, texto: id, dia, criadaEm: criada, feitaEm: feitaDia ? ms(feitaDia) : null });

test('diaDe usa a data local e somarDias atravessa mês e ano', () => {
  assert.equal(L.diaDe(new Date(2026, 9, 28, 23, 59)), '2026-10-28');
  assert.equal(L.diaDe(new Date(2026, 9, 29, 0, 1)), '2026-10-29');
  assert.equal(L.somarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(L.somarDias('2026-01-01', -1), '2025-12-31');
  assert.equal(L.somarDias('2024-02-28', 1), '2024-02-29');   // ano bissexto
  assert.equal(L.somarDias('2026-03-01', -1), '2026-02-28');
});

test('novaTarefa limpa o texto, corta no máximo e recusa vazio', () => {
  assert.equal(L.novaTarefa('   ', '2026-10-28', 1), null);
  assert.equal(L.novaTarefa(null, '2026-10-28', 1), null);
  const t = L.novaTarefa('  pagar   a   conta  ', '2026-10-28', 5);
  assert.equal(t.texto, 'pagar a conta'); assert.equal(t.dia, '2026-10-28'); assert.equal(t.feitaEm, null);
  assert.equal(L.novaTarefa('x'.repeat(500), '2026-10-28', 1, 140).texto.length, 140);
  assert.notEqual(L.novaTarefa('a', 'd', 1).id, L.novaTarefa('a', 'd', 1).id);   // ids diferentes
});

test('ordenar: as que faltam primeiro, as feitas no fim, cada grupo na ordem de criação', () => {
  const lista = [tarefa('c', '2026-10-28', '2026-10-28', 3), tarefa('a', '2026-10-28', null, 1), tarefa('b', '2026-10-28', null, 2), tarefa('d', '2026-10-28', '2026-10-28', 1)];
  assert.deepEqual(L.ordenar(lista).map(t => t.id), ['a', 'b', 'd', 'c']);
});

test('progresso e mensagem', () => {
  assert.deepEqual(L.progresso([]), { total: 0, feitas: 0, pct: 0 });
  const p = L.progresso([tarefa('a', '2026-10-28', '2026-10-28'), tarefa('b', '2026-10-28', null), tarefa('c', '2026-10-28', null)]);
  assert.deepEqual(p, { total: 3, feitas: 1, pct: 33 });
  assert.match(L.mensagem({ total: 0, feitas: 0, pct: 0 }), /primeira tarefa/);
  assert.match(L.mensagem({ total: 3, feitas: 3, pct: 100 }), /Dia fechado/);
});

test('pendentes antigas e trazer para hoje', () => {
  const ts = [tarefa('velha', '2026-10-27', null), tarefa('feita', '2026-10-27', '2026-10-27'), tarefa('hoje', '2026-10-28', null)];
  assert.deepEqual(L.pendentesAntigas(ts, '2026-10-28').map(t => t.id), ['velha']);
  L.trazerParaHoje(ts, ['velha', 'feita', 'hoje'], '2026-10-28');
  const velha = ts.find(t => t.id === 'velha');
  assert.equal(velha.dia, '2026-10-28'); assert.equal(velha.veioDe, '2026-10-27');
  assert.equal(ts.find(t => t.id === 'feita').dia, '2026-10-27');   // feita não anda
  assert.equal(L.pendentesAntigas(ts, '2026-10-28').length, 0);
});

test('sequência: conta dias seguidos e só quebra quando o dia acaba sem nada feito', () => {
  const hoje = '2026-10-28';
  const feitas = (...dias) => dias.map((d, i) => tarefa('t' + i, d, d));
  assert.deepEqual(L.sequencia([], hoje), { dias: 0, cumpridoHoje: false });
  assert.deepEqual(L.sequencia(feitas('2026-10-28'), hoje), { dias: 1, cumpridoHoje: true });
  assert.deepEqual(L.sequencia(feitas('2026-10-26', '2026-10-27', '2026-10-28'), hoje), { dias: 3, cumpridoHoje: true });
  // hoje ainda sem nada: a sequência de ontem continua valendo
  assert.deepEqual(L.sequencia(feitas('2026-10-26', '2026-10-27'), hoje), { dias: 2, cumpridoHoje: false });
  // ontem em branco: quebrou
  assert.deepEqual(L.sequencia(feitas('2026-10-25', '2026-10-26'), hoje), { dias: 0, cumpridoHoje: false });
  // buraco no meio: só conta o trecho final
  assert.deepEqual(L.sequencia(feitas('2026-10-20', '2026-10-21', '2026-10-27', '2026-10-28'), hoje), { dias: 2, cumpridoHoje: true });
  // duas tarefas no mesmo dia contam como um dia só
  assert.equal(L.sequencia([...feitas('2026-10-28'), tarefa('x', '2026-10-28', '2026-10-28')], hoje).dias, 1);
});

test('melhor sequência', () => {
  const feitas = (...dias) => dias.map((d, i) => tarefa('t' + i, d, d));
  assert.equal(L.melhorSequencia([]), 0);
  assert.equal(L.melhorSequencia(feitas('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11')), 3);
  assert.equal(L.melhorSequencia(feitas('2026-12-30', '2026-12-31', '2027-01-01')), 3);   // atravessa o ano
});

test('formatarTempo', () => {
  assert.equal(L.formatarTempo(300), '05:00'); assert.equal(L.formatarTempo(65), '01:05');
  assert.equal(L.formatarTempo(0), '00:00'); assert.equal(L.formatarTempo(-3), '00:00'); assert.equal(L.formatarTempo(299.4), '04:59');
});
