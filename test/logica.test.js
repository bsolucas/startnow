// Testes da lógica (rode com:  node --test test/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logica.js');

const ms = (dia, hora = 12) => { const [a, m, d] = dia.split('-').map(Number); return new Date(a, m - 1, d, hora, 0, 0).getTime(); };
const tarefa = (id, dia, feitaDia, criada = 1) => ({ id, texto: id, dia, criadaEm: criada, feitaEm: feitaDia ? ms(feitaDia) : null });
const dadosCom = (tarefas = [], rotinas = [], feitas = {}) => ({ tarefas, rotinas, feitas });
const HOJE = '2026-10-28';   // quarta-feira

test('datas: diaDe local, somarDias atravessa mês/ano/bissexto, diaSemana, proximosDias, nomeDoDia', () => {
  assert.equal(L.diaDe(new Date(2026, 9, 28, 23, 59)), '2026-10-28');
  assert.equal(L.diaDe(new Date(2026, 9, 29, 0, 1)), '2026-10-29');
  assert.equal(L.somarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(L.somarDias('2026-01-01', -1), '2025-12-31');
  assert.equal(L.somarDias('2024-02-28', 1), '2024-02-29');
  assert.equal(L.diaSemana('2026-10-28'), 3);   // quarta
  assert.equal(L.diaSemana('2026-11-01'), 0);   // domingo
  const sem = L.proximosDias(HOJE, 7);
  assert.equal(sem.length, 7); assert.equal(sem[0].dia, HOJE); assert.equal(sem[6].dia, '2026-11-03');
  assert.deepEqual(sem.map(d => d.semana), [3, 4, 5, 6, 0, 1, 2]);
  assert.equal(L.nomeDoDia(HOJE, HOJE), 'hoje'); assert.equal(L.nomeDoDia('2026-10-29', HOJE), 'amanhã'); assert.equal(L.nomeDoDia('2026-10-31', HOJE), 'sábado');
});

test('novaTarefa limpa o texto, corta no máximo e recusa vazio', () => {
  assert.equal(L.novaTarefa('   ', HOJE, 1), null);
  assert.equal(L.novaTarefa(null, HOJE, 1), null);
  const t = L.novaTarefa('  pagar   a   conta  ', HOJE, 5);
  assert.equal(t.texto, 'pagar a conta'); assert.equal(t.dia, HOJE); assert.equal(t.feitaEm, null);
  assert.equal(L.novaTarefa('x'.repeat(500), HOJE, 1, 140).texto.length, 140);
  assert.notEqual(L.novaTarefa('a', 'd', 1).id, L.novaTarefa('a', 'd', 1).id);
});

test('novaRotina: diária vale todos os dias, semanal exige dias válidos, texto vazio é recusado', () => {
  const d = L.novaRotina('beber água', 'diaria', [], HOJE, 1);
  assert.deepEqual(d.diasSemana, [0, 1, 2, 3, 4, 5, 6]); assert.equal(d.tipo, 'diaria'); assert.equal(d.desde, HOJE);
  const s = L.novaRotina('academia', 'semanal', [3, 1, 3, 9, -1], HOJE, 1);
  assert.deepEqual(s.diasSemana, [1, 3]);   // sem repetidos, sem inválidos, em ordem
  assert.equal(L.novaRotina('academia', 'semanal', [], HOJE, 1), null);
  assert.equal(L.novaRotina('  ', 'diaria', [], HOJE, 1), null);
  assert.equal(L.rotuloRepete(d), 'todo dia'); assert.equal(L.rotuloRepete(s), 'toda segunda e quarta');
});

test('rotinaOcorre: só a partir do dia de criação e só nos dias certos', () => {
  const diaria = L.novaRotina('a', 'diaria', [], HOJE, 1), quarta = L.novaRotina('b', 'semanal', [3], HOJE, 1);
  assert.equal(L.rotinaOcorre(diaria, '2026-10-27'), false);   // antes de existir
  assert.equal(L.rotinaOcorre(diaria, HOJE), true); assert.equal(L.rotinaOcorre(diaria, '2026-12-25'), true);
  assert.equal(L.rotinaOcorre(quarta, HOJE), true); assert.equal(L.rotinaOcorre(quarta, '2026-10-29'), false); assert.equal(L.rotinaOcorre(quarta, '2026-11-04'), true);
});

test('itensDoDia junta únicas e rotinas, com o estado "feita" de cada uma', () => {
  const r1 = L.novaRotina('água', 'diaria', [], '2026-10-20', 10), r2 = L.novaRotina('academia', 'semanal', [1], '2026-10-20', 11);
  const dados = dadosCom([tarefa('a', HOJE, null), tarefa('b', HOJE, HOJE), tarefa('c', '2026-10-29', null)], [r1, r2], { [L.chaveFeita(r1.id, HOJE)]: ms(HOJE) });
  const hoje = L.itensDoDia(dados, HOJE);
  assert.deepEqual(hoje.unicas.map(i => [i.chave, i.feita]), [['a', false], ['b', true]]);
  assert.deepEqual(hoje.rotinas.map(i => [i.texto, i.feita, i.repete]), [['água', true, 'todo dia']]);   // academia é segunda; hoje é quarta
  assert.equal(hoje.rotinas[0].chave, 'r:' + r1.id); assert.equal(hoje.todos.length, 3);
  const segunda = L.itensDoDia(dados, '2026-11-02');
  assert.deepEqual(segunda.rotinas.map(i => [i.texto, i.feita]).sort(), [['academia', false], ['água', false]]);   // outro dia: ninguém marcou
});

test('ordenar e progresso funcionam com itens e com tarefas', () => {
  const lista = [tarefa('c', HOJE, HOJE, 3), tarefa('a', HOJE, null, 1), tarefa('b', HOJE, null, 2), tarefa('d', HOJE, HOJE, 1)];
  assert.deepEqual(L.ordenar(lista).map(t => t.id), ['a', 'b', 'd', 'c']);
  assert.deepEqual(L.progresso([]), { total: 0, feitas: 0, pct: 0 });
  assert.deepEqual(L.progresso([tarefa('a', HOJE, HOJE), tarefa('b', HOJE, null), tarefa('c', HOJE, null)]), { total: 3, feitas: 1, pct: 33 });
  assert.deepEqual(L.progresso([{ feita: true }, { feita: false }]), { total: 2, feitas: 1, pct: 50 });
  assert.match(L.mensagem({ total: 0, feitas: 0, pct: 0 }), /primeira tarefa/); assert.match(L.mensagem({ total: 3, feitas: 3, pct: 100 }), /Tudo feito/);
});

test('pendentes antigas e trazer para hoje (só tarefas únicas)', () => {
  const ts = [tarefa('velha', '2026-10-27', null), tarefa('feita', '2026-10-27', '2026-10-27'), tarefa('hoje', HOJE, null)];
  assert.deepEqual(L.pendentesAntigas(ts, HOJE).map(t => t.id), ['velha']);
  L.trazerParaHoje(ts, ['velha', 'feita', 'hoje'], HOJE);
  const velha = ts.find(t => t.id === 'velha');
  assert.equal(velha.dia, HOJE); assert.equal(velha.veioDe, '2026-10-27'); assert.equal(ts.find(t => t.id === 'feita').dia, '2026-10-27');
});

test('sequência: tarefas únicas e rotinas contam; só quebra quando o dia acaba sem nada', () => {
  const feitas = (...dias) => dadosCom(dias.map((d, i) => tarefa('t' + i, d, d)));
  assert.deepEqual(L.sequencia(dadosCom(), HOJE), { dias: 0, cumpridoHoje: false });
  assert.deepEqual(L.sequencia(feitas('2026-10-28'), HOJE), { dias: 1, cumpridoHoje: true });
  assert.deepEqual(L.sequencia(feitas('2026-10-26', '2026-10-27', '2026-10-28'), HOJE), { dias: 3, cumpridoHoje: true });
  assert.deepEqual(L.sequencia(feitas('2026-10-26', '2026-10-27'), HOJE), { dias: 2, cumpridoHoje: false });   // hoje ainda não: vale a de ontem
  assert.deepEqual(L.sequencia(feitas('2026-10-25', '2026-10-26'), HOJE), { dias: 0, cumpridoHoje: false });   // ontem em branco: quebrou
  assert.deepEqual(L.sequencia(feitas('2026-10-20', '2026-10-21', '2026-10-27', '2026-10-28'), HOJE), { dias: 2, cumpridoHoje: true });
  // só rotinas feitas também contam
  const rot = dadosCom([], [], { 'r1|2026-10-27': ms('2026-10-27'), 'r1|2026-10-28': ms('2026-10-28') });
  assert.deepEqual(L.sequencia(rot, HOJE), { dias: 2, cumpridoHoje: true });
  assert.equal(L.melhorSequencia(dadosCom()), 0);
  assert.equal(L.melhorSequencia(feitas('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11')), 3);
  assert.equal(L.melhorSequencia(feitas('2026-12-30', '2026-12-31', '2027-01-01')), 3);
});

test('nome = login: limpa, ignora acento e maiúscula, gera chave estável', () => {
  assert.equal(L.nomeLimpo('  Maria   da  Silva  '), 'Maria da Silva');
  assert.equal(L.nomeLimpo('x'.repeat(80)).length, 30); assert.equal(L.nomeLimpo(null), '');
  assert.equal(L.normalizarNome('  JOÃO   Álvares '), 'joao alvares');
  assert.equal(L.chavePerfil('João'), L.chavePerfil('joao')); assert.equal(L.chavePerfil('  JOÃO '), 'joao');
  assert.equal(L.chavePerfil('Maria da Silva'), 'maria-da-silva'); assert.notEqual(L.chavePerfil('Ana'), L.chavePerfil('Ana Paula'));
  assert.equal(L.chavePerfil('!!!'), 'perfil');
});

test('migrar leva dados antigos para o formato atual sem perder nada', () => {
  const v1 = { versao: 1, tarefas: [tarefa('a', HOJE, null)], foco: null };
  const v2 = L.migrar(v1, 'Maria');
  assert.equal(v2.versao, 2); assert.deepEqual(v2.rotinas, []); assert.deepEqual(v2.feitas, {}); assert.equal(v2.tarefas.length, 1); assert.equal(v2.nome, 'Maria');
  assert.deepEqual(L.migrar(null).tarefas, []); assert.equal(L.migrar({ nome: 'Ana' }, 'Outra').nome, 'Ana');
});

test('formatarTempo', () => {
  assert.equal(L.formatarTempo(300), '05:00'); assert.equal(L.formatarTempo(65), '01:05');
  assert.equal(L.formatarTempo(-3), '00:00'); assert.equal(L.formatarTempo(299.4), '04:59');
});
