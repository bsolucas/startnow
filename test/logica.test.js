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
  assert.equal(v2.versao, 3); assert.deepEqual(v2.rotinas, []); assert.deepEqual(v2.feitas, {}); assert.equal(v2.tarefas.length, 1); assert.equal(v2.nome, 'Maria');
  assert.deepEqual(L.migrar(null).tarefas, []); assert.equal(L.migrar({ nome: 'Ana' }, 'Outra').nome, 'Ana');
});

test('formatarTempo', () => {
  assert.equal(L.formatarTempo(300), '05:00'); assert.equal(L.formatarTempo(65), '01:05');
  assert.equal(L.formatarTempo(-3), '00:00'); assert.equal(L.formatarTempo(299.4), '04:59');
});

test('horários: normalizar, validar, rótulo, duração e sobreposição', () => {
  assert.equal(L.normalizarHora('9:05'), '09:05'); assert.equal(L.normalizarHora(' 23:59 '), '23:59'); assert.equal(L.normalizarHora('00:00'), '00:00');
  for (const ruim of ['24:00', '12:60', '9', '', null, 'abc', '12:5']) assert.equal(L.normalizarHora(ruim), null, String(ruim));
  assert.deepEqual(L.validarHorario('', ''), { ok: true, inicio: null, fim: null });
  assert.deepEqual(L.validarHorario('09:00', ''), { ok: true, inicio: '09:00', fim: null });
  assert.deepEqual(L.validarHorario('9:00', '10:30'), { ok: true, inicio: '09:00', fim: '10:30' });
  assert.equal(L.validarHorario('', '10:00').ok, false);                  // fim sem início
  assert.equal(L.validarHorario('10:00', '10:00').ok, false);             // fim igual ao início
  assert.match(L.validarHorario('11:00', '10:00').erro, /depois do início/);
  assert.equal(L.validarHorario('25:00', '').ok, false);
  assert.equal(L.rotuloHorario('09:00', '10:30'), '09:00–10:30'); assert.equal(L.rotuloHorario('09:00', null), 'a partir das 09:00'); assert.equal(L.rotuloHorario(null, null), '');
  assert.equal(L.duracao('09:00', '10:30'), '1h30'); assert.equal(L.duracao('09:00', '09:45'), '45min'); assert.equal(L.duracao('09:00', '11:00'), '2h'); assert.equal(L.duracao('09:00', null), '');
  assert.equal(L.sobrepoe('09:00', '10:00', '09:30', '10:30'), true);
  assert.equal(L.sobrepoe('09:00', '10:00', '10:00', '11:00'), false);    // encostar não é conflito
  assert.equal(L.sobrepoe('09:00', '10:00', '09:30', null), false);       // sem fim não dá para saber
  assert.equal(L.sobrepoe('09:00', '12:00', '10:00', '11:00'), true);     // um dentro do outro
});

test('ordenar: quem tem horário vem antes (do mais cedo ao mais tarde), feitas no fim', () => {
  const t = (id, inicio, feita, criada) => ({ id, inicio, feita: !!feita, criadaEm: criada });
  const lista = [t('sem1', null, false, 1), t('tarde', '15:00', false, 5), t('feita', '08:00', true, 2), t('cedo', '08:30', false, 6), t('sem2', null, false, 3)];
  assert.deepEqual(L.ordenar(lista).map(x => x.id), ['cedo', 'tarde', 'sem1', 'sem2', 'feita']);
});

test('tarefas e rotinas guardam categoria e horário, e itensDoDia repassa', () => {
  const t = L.novaTarefa('reunião', HOJE, 1, 140, { categoriaId: 'c-trabalho', inicio: '09:00', fim: '10:00' });
  assert.equal(t.categoriaId, 'c-trabalho'); assert.equal(t.inicio, '09:00'); assert.equal(t.fim, '10:00');
  const sem = L.novaTarefa('algo', HOJE, 2); assert.equal(sem.categoriaId, null); assert.equal(sem.inicio, null);
  const r = L.novaRotina('estudar', 'diaria', [], HOJE, 3, 140, { categoriaId: 'c-estudos', inicio: '20:00', fim: '21:00' });
  const itens = L.itensDoDia(dadosCom([t], [r]), HOJE).todos;
  assert.deepEqual(itens.map(i => [i.texto, i.categoriaId, i.inicio, i.fim]), [['reunião', 'c-trabalho', '09:00', '10:00'], ['estudar', 'c-estudos', '20:00', '21:00']]);
});

test('conflitos: acha só tarefas pendentes que se sobrepõem', () => {
  const itens = [{ texto: 'a', inicio: '09:00', fim: '10:00', feita: false }, { texto: 'b', inicio: '09:00', fim: '10:00', feita: true }, { texto: 'c', inicio: '14:00', fim: '15:00', feita: false }, { texto: 'd', inicio: null, fim: null, feita: false }];
  assert.deepEqual(L.conflitos(itens, '09:30', '10:30').map(i => i.texto), ['a']);
  assert.deepEqual(L.conflitos(itens, '10:00', '11:00'), []);
  assert.deepEqual(L.conflitos(itens, '08:00', '23:00').map(i => i.texto), ['a', 'c']);
});

test('categorias: padrão, nova (sem repetir), remover mantém as tarefas e agrupar', () => {
  const padrao = L.categoriasPadrao();
  assert.deepEqual(padrao.map(c => c.nome), ['Trabalho', 'Casa', 'Estudos', 'Tempo livre', 'Compromissos', 'Lista de supermercado']);
  assert.equal(new Set(padrao.map(c => c.id)).size, 6);
  assert.equal(L.novaCategoria('  ', null, padrao, 1), null);
  assert.equal(L.novaCategoria('trabalho', null, padrao, 1), null);        // já existe (maiúscula não importa)
  assert.equal(L.novaCategoria('ESTUDOS', null, padrao, 1), null);
  const nova = L.novaCategoria('  Academia  ', null, padrao, 5); assert.equal(nova.nome, 'Academia'); assert.match(nova.cor, /^#[0-9a-f]{6}$/);
  assert.equal(L.novaCategoria('x'.repeat(60), null, [], 1).nome.length, 24);

  const dados = L.migrar({ tarefas: [L.novaTarefa('a', HOJE, 1, 140, { categoriaId: 'c-casa' }), L.novaTarefa('b', HOJE, 2, 140, { categoriaId: 'c-trabalho' })],
                           rotinas: [L.novaRotina('c', 'diaria', [], HOJE, 3, 140, { categoriaId: 'c-casa' })] });
  const grupos = L.porCategoria(L.itensDoDia(dados, HOJE).todos, dados.categorias);
  assert.deepEqual(grupos.map(g => [g.categoria.nome, g.itens.map(i => i.texto)]), [['Trabalho', ['b']], ['Casa', ['a', 'c']]]);   // ordem das categorias, não da criação
  L.removerCategoria(dados, 'c-casa');
  assert.equal(dados.categorias.some(c => c.id === 'c-casa'), false); assert.equal(dados.tarefas[0].categoriaId, null); assert.equal(dados.rotinas[0].categoriaId, null);
  const depois = L.porCategoria(L.itensDoDia(dados, HOJE).todos, dados.categorias);
  assert.deepEqual(depois.map(g => g.categoria ? g.categoria.nome : 'sem categoria'), ['Trabalho', 'sem categoria']);   // as tarefas continuam, sem categoria
});

test('migrar: dados antigos ganham as categorias padrão e a visão "tipo"', () => {
  const d = L.migrar({ versao: 2, tarefas: [], rotinas: [], feitas: {} }, 'Ana');
  assert.equal(d.versao, 3); assert.equal(d.categorias.length, 6); assert.equal(d.visao, 'tipo');
  const mantem = L.migrar({ categorias: [{ id: 'x', nome: 'Só esta', cor: '#000000' }], visao: 'categoria' });
  assert.equal(mantem.categorias.length, 1); assert.equal(mantem.visao, 'categoria');
});

test('duração em segundos, tempo com horas e texto da duração', () => {
  assert.equal(L.duracaoSegundos('09:00', '10:30'), 5400); assert.equal(L.duracaoSegundos('09:00', '09:05'), 300);
  assert.equal(L.duracaoSegundos('09:00', null), null); assert.equal(L.duracaoSegundos(null, '10:00'), null); assert.equal(L.duracaoSegundos('10:00', '09:00'), null);
  assert.equal(L.formatarTempo(300), '05:00'); assert.equal(L.formatarTempo(3599), '59:59'); assert.equal(L.formatarTempo(3600), '01:00:00'); assert.equal(L.formatarTempo(5400), '01:30:00'); assert.equal(L.formatarTempo(36000 + 61), '10:01:01');
  assert.equal(L.textoDuracao(300), '5 minutos'); assert.equal(L.textoDuracao(60), '1 minuto'); assert.equal(L.textoDuracao(5400), '1h30'); assert.equal(L.textoDuracao(7200), '2h');
});

test('editarItem: muda horário, texto e categoria; recusa dados inválidos sem alterar nada', () => {
  const dados = L.migrar({ tarefas: [L.novaTarefa('reunião', HOJE, 1, 140, { categoriaId: 'c-trabalho', inicio: '09:00', fim: '10:00' })],
                           rotinas: [L.novaRotina('estudar', 'diaria', [], HOJE, 2, 140, { inicio: '20:00', fim: '21:00' })] });
  const idT = dados.tarefas[0].id, idR = 'r:' + dados.rotinas[0].id;
  assert.deepEqual(L.editarItem(dados, idT, { texto: '  Reunião   com a equipe ', categoriaId: 'c-casa', inicio: '10:00', fim: '11:30' }), { ok: true });
  assert.deepEqual([dados.tarefas[0].texto, dados.tarefas[0].categoriaId, dados.tarefas[0].inicio, dados.tarefas[0].fim], ['Reunião com a equipe', 'c-casa', '10:00', '11:30']);
  // tirar o horário
  L.editarItem(dados, idT, { texto: 'x', categoriaId: null, inicio: '', fim: '' });
  assert.deepEqual([dados.tarefas[0].inicio, dados.tarefas[0].fim], [null, null]);
  // rotina: vale para a rotina inteira
  assert.equal(L.editarItem(dados, idR, { texto: 'estudar inglês', categoriaId: 'c-estudos', inicio: '19:00', fim: '19:45' }).ok, true);
  assert.deepEqual([dados.rotinas[0].texto, dados.rotinas[0].inicio, dados.rotinas[0].fim], ['estudar inglês', '19:00', '19:45']);
  assert.equal(L.itensDoDia(dados, '2026-11-10').rotinas[0].inicio, '19:00');   // vale em outro dia também
  // inválidos: nada muda
  const antes = JSON.stringify(dados);
  assert.match(L.editarItem(dados, idT, { texto: '   ', inicio: '', fim: '' }).erro, /sem texto/);
  assert.match(L.editarItem(dados, idT, { texto: 'ok', inicio: '11:00', fim: '10:00' }).erro, /depois do início/);
  assert.match(L.editarItem(dados, idT, { texto: 'ok', inicio: '', fim: '10:00' }).erro, /início/);
  assert.match(L.editarItem(dados, 'nao-existe', { texto: 'ok' }).erro, /não existe/);
  assert.equal(JSON.stringify(dados), antes);
  // categoria que não existe vira "sem categoria"
  L.editarItem(dados, idT, { texto: 'ok', categoriaId: 'c-fantasma', inicio: '', fim: '' }); assert.equal(dados.tarefas[0].categoriaId, null);
});
