const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const helpers = vm.createContext({});
vm.runInContext(read('lib/scheduleSheet.js').replace(/export /g, '')
  + '\n globalThis.api = { csvToRows, normalizeScheduleText };', helpers);
const gidsContext = vm.createContext({});
vm.runInContext(read('data/prisonScheduleMonthGids.js').replace(/export /g, '')
  + '\n globalThis.gids = PRISON_SCHEDULE_MONTH_GIDS;', gidsContext);
const monthInfo = { year: 2026, month: 11, monthLabel: '2026년 11월' };
// Public A4:N30 export, with the unused rows compressed just as csvToRows does.
const fixture = [
  '11월,,,,,,,,,,,,',
  '일,,월,,화,,수,,목,,금,,토',
  '1,,2, ,3,,4,,5,,6,,7',
  ',,,,,,,,점호,,녹음?,,타임어택?',
  ',,,,,,,,,,,,',
  '8,,9,,10,,11,,12,,13,,14',
  '타임어택?,,휴,,비비정식,,빼빼로만들기,,노방종,,,,',
  '15,,16,,17,,18,,19,,20,,21',
  '22,,23,,24,,25,,26,,27,,28',
  '29,,30,,,,,,,,,,',
].join('\r\n');
function load(fetchImpl = async () => { throw new Error('unexpected fetch'); }) {
  const ctx = vm.createContext({
    ...helpers.api, PRISON_SCHEDULE_MONTH_GIDS: gidsContext.gids,
    AbortSignal, fetch: fetchImpl,
  });
  vm.runInContext(read('lib/vivianScheduleSource.js').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')
    + '\n globalThis.api = { parseVivianScheduleRows, buildFreshVivianScheduleResponse, VIVIAN_SHEET_ID };', ctx);
  return ctx.api;
}
const rows = () => helpers.api.csvToRows(fixture);
const nonEmpty = (items) => Array.from(items).filter((item) => !item.empty);

test('actual November events are assigned to their original dates, despite the Jan tab name', () => {
  const items = load().parseVivianScheduleRows(rows(), 2026, 11);
  assert.equal(items.length, 30);
  assert.deepEqual(nonEmpty(items).map(({ dayNumber, title }) => [dayNumber, title]), [
    [5, '점호'], [6, '녹음?'], [7, '타임어택?'], [8, '타임어택?'],
    [9, '휴'], [10, '비비정식'], [11, '빼빼로만들기'], [12, '노방종'],
  ]);
  assert.equal(items[0].day, '일');
  assert.equal(items[29].day, '월');
  assert(items.every((item) => item.year === 2026 && item.month === 11));
});

test('wrong month, missing month heading, and the blank Nov/1900 template are rejected', () => {
  const parse = load().parseVivianScheduleRows;
  assert.throws(() => parse(rows(), 2026, 12), /실제 월/);
  assert.throws(() => parse(rows().slice(1), 2026, 11), /실제 월/);
  assert.throws(() => parse([['NOVEMBER 1900'], ['Sunday', '', 'Monday']], 2026, 11), /요일 행/);
  assert.throws(() => parse(helpers.api.csvToRows(fixture.replace('11월', '2025년 11월')), 2026, 11), /실제 월/);
});

test('incomplete or misaligned date grids fail instead of shifting events', () => {
  assert.throws(() => load().parseVivianScheduleRows(rows().slice(0, -1), 2026, 11), /날짜 배열/);
  assert.throws(() => load().parseVivianScheduleRows(rows(), 2027, 11), /날짜 배열/);
});

test('paired columns and multiline annotations stay with the same day, including the last day', () => {
  const input = rows();
  input.splice(4, 0, ['', '', '', '', '', '', '', '', '(w/박하악)']);
  input.push(['29일 방송', '', '30일 방송', '(w/은성)']);
  const items = load().parseVivianScheduleRows(input, 2026, 11);
  assert.equal(items[4].title, '점호 / (w / 박하악)');
  assert.equal(items[28].title, '29일 방송');
  assert.equal(items[29].title, '30일 방송 / (w / 은성)');
});

test('a fully cleared but structurally valid calendar can replace stale event text', () => {
  const input = rows().filter((row) => row.every((cell) => !cell || /^\d+$/.test(cell))
    || row[0] === '11월' || row[0] === '일');
  const items = load().parseVivianScheduleRows(input, 2026, 11);
  assert.equal(nonEmpty(items).length, 0);
});

test('one bounded export request excludes settings and free-form footer notes', async () => {
  const calls = [];
  const api = load(async (url, options) => {
    calls.push({ url, options });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('gid'), '209391694');
    assert.equal(parsed.searchParams.get('range'), 'A4:N30');
    return { ok: true, text: async () => fixture };
  });
  const result = await api.buildFreshVivianScheduleResponse(monthInfo);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.cache, 'no-store');
  assert(calls[0].options.signal);
  assert.equal(result.ok, true);
  assert.equal(result.member, '비비안');
  assert.equal(result.sheetName, 'Jan');
  assert(result.sourceUrl.endsWith('gid=209391694#gid=209391694'));
  assert.equal(nonEmpty(result.items).length, 8);
  assert(result.items.every((item) => !/업보|드래곤|1900|\[42\]/.test(item.title)));
});

test('unverified months do not fetch a default or English template tab', async () => {
  const api = load();
  for (const info of [{ year: 2026, month: 10 }, { year: 2026, month: 12 }, { year: 2027, month: 11 }]) {
    const result = await api.buildFreshVivianScheduleResponse(info);
    assert.equal(result.ok, false);
    assert.equal(result.items.length, 0);
  }
});

test('upstream HTTP, network, and invalid-data failures propagate to the existing stale-cache layer', async () => {
  await assert.rejects(load(async () => ({ ok: false, status: 503 })).buildFreshVivianScheduleResponse(monthInfo), /503/);
  await assert.rejects(load(async () => { throw new Error('timeout'); }).buildFreshVivianScheduleResponse(monthInfo), /timeout/);
  await assert.rejects(load(async () => ({ ok: true, text: async () => '<html>error</html>' })).buildFreshVivianScheduleResponse(monthInfo), /요일 행/);
});

function loadHandler(record, fetchVivian = async () => ({ ok: true, member: '비비안', items: [{ title: '점호', empty: false }] })) {
  const calls = { writes: [], vivian: 0 };
  const ctx = vm.createContext({
    PRISON_SCHEDULE_MONTH_GIDS: gidsContext.gids, VIVIAN_SHEET_ID: 'test-sheet',
    PRISON_MANUAL_SCHEDULES: { vivian: { member: '비비안', items: [] } },
    getAllowedScheduleMonth: () => monthInfo,
    readSnapshotCache: async () => ({ record, storage: 'kv' }),
    writeSnapshotCache: async (...args) => { calls.writes.push(args); return 'kv'; },
    filterPrisonSchedulePayload: (payload) => payload,
    buildFreshJangjisuScheduleResponse: async () => ({ ok: true, member: '장지수', items: [] }),
    buildFreshVivianScheduleResponse: async () => { calls.vivian += 1; return fetchVivian(); },
    resolveSheetGid: async () => '',
    fetch: async () => { throw new Error('unexpected upstream'); },
  });
  vm.runInContext(read('pages/api/prison-schedule.js').replace(/^import .*;\r?\n/gm, '').replace('export default ', '')
    + '\n globalThis.handler = handler;', ctx);
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
  return { calls, run: async () => { await ctx.handler({ query: {} }, res); return res.payload; } };
}

test('old fresh manual cache is upgraded once, preserving other member data', async () => {
  const saved = { ok: true, member: '구월이', items: [{ title: '기존 일정', empty: false }] };
  const app = loadHandler({ cachedAt: Date.now(), payload: {
    schedules: [saved], sourceStatus: [{ member: '비비안', manual: true }],
  } });
  const payload = await app.run();
  assert.equal(app.calls.vivian, 1);
  assert.equal(app.calls.writes.length, 1);
  assert.equal(payload.schedules.find((s) => s.member === '구월이'), saved);
  assert.equal(payload.schedules.filter((s) => s.member === '비비안').length, 1);
  assert(payload.sourceStatus.some((s) => s.member === '비비안' && !s.manual && s.ok));
  assert.equal(app.calls.writes[0][1], 'prison:schedules:2026-11:v4');
});

test('already migrated fresh cache makes no upstream calls or writes', async () => {
  const app = loadHandler({ cachedAt: Date.now(), payload: {
    schedules: [], sourceStatus: [{ member: '비비안', ok: true }],
  } });
  assert.equal((await app.run()).cache, 'hit');
  assert.equal(app.calls.vivian, 0);
  assert.equal(app.calls.writes.length, 0);
});

test('failed Vivian refresh preserves the previous Vivian snapshot', async () => {
  const saved = { member: '비비안', items: [{ title: '이전 정상 일정', empty: false }] };
  const app = loadHandler({ cachedAt: Date.now() - 3600001, payload: {
    schedules: [saved], sourceStatus: [{ member: '비비안', ok: true }],
  } }, async () => { throw new Error('timeout'); });
  const payload = await app.run();
  assert.equal(payload.schedules.find((s) => s.member === '비비안'), saved);
  assert(payload.sourceStatus.some((s) => s.member === '비비안' && s.stale));
});

test('only Vivian is restored in the standalone calendar and shared source uses the sheet API', () => {
  const hook = read('components/prison/schedule-calendar/useScheduleCalendarData.js');
  assert.match(hook, /HIDDEN_CALENDAR_MEMBERS = new Set\(\['amanemay', 'ximong'\]\)/);
  const config = read('data/prisonScheduleSources.js');
  assert.match(config, /key: 'vivian',[\s\S]*?endpoint: '\/api\/prison-schedule\?key=vivian&v=1'/);
});
