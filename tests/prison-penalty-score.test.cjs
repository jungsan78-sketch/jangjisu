const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/prisonPenaltyScore.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(source.replace(/export /g, '') + '\n globalThis.result = { buildPenaltyRankings, PENALTY_METRICS };', ctx);
const api = ctx.result;
const score = api.buildPenaltyRankings;
const m = (id, values, extra = {}) => ({
  id, nickname: id, image: 'https://example.com/avatar.jpg', monthlyReady: true, cumulativeReady: true,
  peakViewers: values[0], cumulativeViewers: values[1], broadcastMinutes: values[2], donations: values[3],
  ...extra,
});

test('four metrics have equal weights totaling 100', () => {
  assert.equal(api.PENALTY_METRICS.length, 4);
  assert(api.PENALTY_METRICS.every(p => p.weight === 25));
  assert.equal(api.PENALTY_METRICS.reduce((sum, p) => sum + p.weight, 0), 100);
});

test('single first and last place receive 100 and 0, with proportional middle scores', () => {
  const result = score([m('a', [3, 3, 3, 3]), m('b', [2, 2, 2, 2]), m('c', [1, 1, 1, 1])]);
  assert.deepEqual(Array.from(result, p => p.penaltyScore), [100, 50, 0]);
  assert(result[2].penaltyIsLowest);
  assert.equal(result[2].penaltyRank, 3);
});

test('large raw donation values cannot dominate the other three metrics', () => {
  const result = score([m('a', [3, 3, 3, 1]), m('b', [1, 1, 1, 1e15]), m('c', [2, 2, 2, 2])]);
  assert.equal(result[0].id, 'a');
  assert.equal(result[0].penaltyScore, 75);
  assert.equal(result[2].id, 'b');
  assert.equal(result[2].penaltyScore, 25);
});

test('identical metric values receive identical average-rank points', () => {
  const result = score([m('a', [10, 3, 3, 3]), m('b', [10, 2, 2, 2]), m('c', [0, 1, 1, 1])]);
  assert.equal(result[0].penaltyBreakdown[0].averageRank, 1.5);
  assert.equal(result[0].penaltyBreakdown[0].score, 18.75);
  assert.equal(result[1].penaltyBreakdown[0].score, 18.75);
});

test('ties in total score share competition rank without arbitrary tie-breaking', () => {
  const result = score([m('a', [3, 3, 3, 3]), m('b', [1, 2, 1, 2]), m('c', [2, 1, 2, 1])]);
  assert.deepEqual(Array.from(result, p => p.penaltyRank), [1, 2, 2]);
  assert(result[1].penaltyIsLowest && result[2].penaltyIsLowest);
  assert(result[1].penaltyLowestTied && result[2].penaltyLowestTied);
});

test('all members tied receive 50 and no singled-out penalty target', () => {
  const result = score([m('a', [0, 0, 0, 0]), m('b', [0, 0, 0, 0]), m('c', [0, 0, 0, 0])]);
  assert(result.every(p => p.penaltyScore === 50 && p.penaltyRank === 1 && !p.penaltyIsLowest));
});

test('equal totals with different metric ranks remain genuine ties', () => {
  const result = score([m('a', [3, 1, 3, 1]), m('b', [1, 3, 1, 3]), m('c', [2, 2, 2, 2])]);
  assert(result.every(p => p.penaltyScore === 50 && p.penaltyRank === 1));
});

test('pending members are excluded, not incorrectly assigned zero points', () => {
  const result = score([m('pending', [99, 99, 99, 99], { monthlyReady: false }), m('ready', [1, 1, 1, 1])]);
  assert.equal(result[0].id, 'ready');
  assert.equal(result[0].penaltyScore, 100);
  assert(!result[0].penaltyIsLowest);
  assert.equal(result[1].penaltyScore, null);
  assert.equal(result[1].penaltyRank, null);
  assert(!result[1].penaltyReady);
});

test('missing, negative, infinite or incomplete data is pending rather than ranked', () => {
  const result = score([
    m('null', [null, 1, 1, 1]), m('negative', [-1, 1, 1, 1]),
    m('infinite', [Infinity, 1, 1, 1]), m('missing', [1, 1, 1]),
    m('cumulative', [1, 1, 1, 1], { cumulativeReady: false }),
  ]);
  assert(result.every(p => !p.penaltyReady && p.penaltyRank === null));
});

test('empty and single-member inputs remain finite and deterministic', () => {
  assert.equal(score().length, 0);
  const only = score([m('one', [0, 0, 0, 0])])[0];
  assert.equal(only.penaltyScore, 100);
  assert.equal(only.penaltyRank, 1);
  assert(!only.penaltyIsLowest);
});

test('calculation does not mutate existing rankings or their ordering', () => {
  const input = [m('b', [1, 1, 1, 1]), m('a', [2, 2, 2, 2])];
  const original = JSON.stringify(input);
  score(input);
  assert.equal(JSON.stringify(input), original);
});

test('scores remain within bounds and equal the unrounded component sum for 12 members', () => {
  const result = score(Array.from({ length: 12 }, (_, i) => m(String(i), [i % 4, 12 - i, i * 7, i % 3])));
  for (const member of result) {
    assert(member.penaltyScore >= 0 && member.penaltyScore <= 100);
    assert(member.penaltyBreakdown.every(p => p.score >= 0 && p.score <= 25));
    const sum = member.penaltyBreakdown.reduce((total, p) => total + p.score, 0);
    assert(Math.abs(sum - member.penaltyScore) < 1e-10);
  }
});

async function loadComponent() {
  const { transform } = require('next/dist/build/swc');
  const file = 'components/prison/broadcast-data/BroadcastDataRanking.js';
  const result = await transform(fs.readFileSync(path.join(root, file), 'utf8'), {
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  });
  const module = { exports: {} };
  vm.runInNewContext(result.code, { module, exports: module.exports,
    require: name => name === '../../../lib/prisonPenaltyScore' ? api : require(name), Intl,
  });
  return module.exports.default;
}

test('UI adds the fifth button last, renders breakdowns, and preserves all four original modes', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { load } = require('cheerio');
  const Component = await loadComponent();
  const members = [m('장지수', [3, 3, 3, 3]), m('포포', [1, 1, 1, 1]), m('대기', [0, 0, 0, 0], { monthlyReady: false })];
  const rankings = { peakViewers: members, cumulativeViewers: members, broadcastMinutes: members, donations: members };
  for (const mode of ['peakViewers', 'cumulativeViewers', 'broadcastMinutes', 'donations', 'penalty']) {
    const html = renderToStaticMarkup(React.createElement(Component, { rankings, mode, onModeChange() {}, onSelectMember() {}, selectedMemberId: '장지수' }));
    const $ = load(html);
    const buttons = $('section > div').first().find('button');
    assert.equal(buttons.length, 5);
    assert.equal(buttons.last().text(), '벌칙점수 순위');
    assert.equal($('.sou-data-rank').length, 3);
    assert.equal($('.sou-data-rank[aria-pressed=true]').length, 1);
    if (mode === 'penalty') {
      assert(html.includes('100.00점') && html.includes('0.00점'));
      assert(html.includes('집계 중') && html.includes('벌칙위기'));
      assert(!html.includes('현재 최하위') && !html.includes('공동 최하위'));
      assert(html.includes('장지수 포함'));
      assert.equal($('.sou-data-rank').first().find('.grid span.font-bold').length, 4);
      assert(!buttons.first().attr('class').includes('bg-violet-300'));
    } else {
      assert(!html.includes('100.00점'));
      assert(!html.includes('벌칙위기'));
    }
  }
});

test('tied scores render matching rank badges and pending rows have no false rank', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { load } = require('cheerio');
  const Component = await loadComponent();
  const members = [m('a', [1, 1, 1, 1]), m('b', [1, 1, 1, 1]), m('p', [0, 0, 0, 0], { monthlyReady: false })];
  const html = renderToStaticMarkup(React.createElement(Component, { rankings: { peakViewers: members }, mode: 'penalty', onModeChange() {}, onSelectMember() {} }));
  const $ = load(html);
  assert.equal($('.sou-data-rank [aria-label="1위, 금"]').length, 2);
  assert.equal($('.sou-data-rank [aria-label="집계 중"]').length, 1);
  assert(!html.includes('벌칙위기'));
});

test('joint lowest scores display the agreed shared risk wording', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { load } = require('cheerio');
  const Component = await loadComponent();
  const members = [m('a', [3, 3, 3, 3]), m('b', [1, 2, 1, 2]), m('c', [2, 1, 2, 1])];
  const html = renderToStaticMarkup(React.createElement(Component, { rankings: { peakViewers: members }, mode: 'penalty', onModeChange() {}, onSelectMember() {} }));
  const $ = load(html);
  assert.equal($('.sou-data-rank span').filter((_i, el) => $(el).text() === '공동 벌칙위기').length, 2);
  assert(!html.includes('현재 최하위') && !html.includes('공동 최하위'));
});
