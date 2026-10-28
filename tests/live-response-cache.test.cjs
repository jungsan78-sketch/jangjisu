const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');

function load(file, names, globals = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
    .replace(/export\s+\{[^}]*\}\s+from\s+'[^']+';\s*/g, '')
    .replace(/import[\s\S]*?from\s+'[^']+';\s*/g, '')
    .replace(/export default /g, '').replace(/export /g, '');
  const context = vm.createContext({ console, Date, ...globals });
  vm.runInContext(source + `\n globalThis.result = { ${names.join(',')} };`, context, { filename: file });
  return context.result;
}

const { ALL_PRISON_MEMBERS } = load('data/prisonMembers.js', ['ALL_PRISON_MEMBERS']);
const active = load('lib/activePrisonMembers.js', ['filterPrisonMemberMap'], { ALL_PRISON_MEMBERS });
const offline = { isLive: false, liveState: 'confirmed_offline', fetchedAt: '2026-10-28T00:00:00Z' };
const online = { isLive: true, liveState: 'confirmed_live', broadNo: '123', fetchedAt: '2026-10-28T00:00:00Z' };
const livePayload = () => ({ statuses: { 장지수: { ...online }, 포포: { ...offline } }, source: 'soop_direct', debug: { upstream: true } });
const clone = (value) => value && JSON.parse(JSON.stringify(value));

function harness(initial = null, overrides = {}) {
  const state = { time: 1793145600000, record: clone(initial), reads: 0, writes: [], calls: 0 };
  const defaults = {
    ...active,
    readSnapshotCache: async () => ({ record: null, storage: 'unknown' }),
    writeSnapshotCache: async () => 'unknown',
    fetchLiveStatusPayload: async () => livePayload(),
    buildFallbackStatuses: () => ({ 장지수: { ...offline, liveState: 'fallback' }, 포포: { ...offline, liveState: 'fallback' } }),
  };
  const api = load('lib/soop/liveResponseCache.js', ['createLiveStatusCache', 'SOOP_LIVE_RESPONSE_CACHE_KEY', 'SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS'], defaults);
  const get = api.createLiveStatusCache({
    now: () => state.time,
    readCache: async () => { state.reads++; return { record: clone(state.record), storage: 'cloudflare-kv' }; },
    writeCache: async (_cache, key, record, ttl) => {
      state.writes.push({ key, record: clone(record), ttl });
      state.record = clone(record);
      return 'cloudflare-kv';
    },
    fetchLive: async () => { state.calls++; return livePayload(); },
    ...overrides,
  });
  return { get, state, ...api };
}

test('KV hit serves saved payload without any upstream call', async () => {
  const h = harness({ cachedAt: 1793145599000, payload: livePayload() });
  const result = await h.get();
  assert.equal(result.cache, 'hit');
  assert.equal(result.cacheStorage, 'cloudflare-kv');
  assert.equal(h.state.calls, 0);
  assert.equal(h.state.writes.length, 0);
  assert(!('debug' in result));
});

test('one response is shared by both API routes using the existing key', async () => {
  const h = harness();
  assert.equal(h.SOOP_LIVE_RESPONSE_CACHE_KEY, 'soop:live-status:response:v6');
  assert.equal(h.SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS, 300);
  await h.get();
  const second = await h.get();
  assert.equal(second.cache, 'hit');
  assert.equal(h.state.calls, 1);
  assert.equal(h.state.writes[0].ttl, 86400);
});

test('exact five-minute boundary refreshes, while stale retention remains 24 hours', async () => {
  const h = harness();
  await h.get();
  h.state.time += 299999;
  assert.equal((await h.get()).cache, 'hit');
  h.state.time++;
  assert.equal((await h.get()).cache, 'refresh');
  assert.equal(h.state.calls, 2);
});

test('retired members are removed from legacy cached responses', async () => {
  const payload = livePayload();
  payload.statuses.린링 = online;
  payload.statuses.냥냥두둥 = online;
  const h = harness({ cachedAt: 1793145599000, payload });
  const result = await h.get();
  assert.deepEqual(Object.keys(result.statuses), ['장지수', '포포']);
  assert.equal(Object.keys(h.state.record.payload.statuses).length, 4);
});

test('upstream outage preserves the old ON state but marks it unconfirmed', async () => {
  const h = harness({ cachedAt: 1793145200000, payload: livePayload() }, { fetchLive: async () => { throw Error('network down'); } });
  const result = await h.get();
  assert.equal(result.cache, 'stale');
  assert.equal(result.statuses.장지수.isLive, true);
  assert.equal(result.statuses.장지수.liveState, 'unknown_previous');
  assert.equal(result.cachedAt, new Date(1793145200000).toISOString());
  assert.equal(h.state.writes.length, 0);
});

test('all-unknown responses cannot overwrite a valid snapshot', async () => {
  const h = harness({ cachedAt: 1793145200000, payload: livePayload() }, {
    fetchLive: async () => ({ statuses: { 장지수: { isLive: false, liveState: 'unknown' } } }),
  });
  assert.equal((await h.get()).cache, 'stale');
  assert.equal(h.state.writes.length, 0);
});

test('fallback results cannot become fresh confirmations', async () => {
  const h = harness({ cachedAt: 1793145200000, payload: livePayload() }, {
    fetchLive: async () => ({ ...livePayload(), source: 'stable_previous_fallback' }),
  });
  assert.equal((await h.get()).cache, 'stale');
  assert.equal(h.state.writes.length, 0);
});

test('partial failure keeps previous member status while refreshing successful members', async () => {
  const h = harness({ cachedAt: 1793145200000, payload: livePayload() }, {
    fetchLive: async () => ({ statuses: { 장지수: { isLive: false, liveState: 'unknown' }, 포포: online } }),
  });
  const result = await h.get();
  assert.equal(result.cache, 'refresh');
  assert.equal(result.statuses.장지수.isLive, true);
  assert.equal(result.statuses.장지수.liveState, 'unknown_previous');
  assert.equal(result.statuses.포포.isLive, true);
});

test('without any cache, outage returns unknown instead of confirmed OFF', async () => {
  const h = harness(null, { fetchLive: async () => { throw Error('down'); } });
  const result = await h.get();
  assert.equal(result.ok, false);
  assert.equal(result.cache, 'unavailable');
  assert(Object.values(result.statuses).every(s => s.liveState === 'unknown'));
  assert.equal(h.state.writes.length, 0);
});

test('100 simultaneous requests in one isolate share one upstream refresh', async () => {
  const h = harness();
  const results = await Promise.all(Array.from({ length: 100 }, () => h.get()));
  assert.equal(h.state.calls, 1);
  assert.equal(h.state.writes.length, 1);
  assert.equal(h.state.reads, 1);
  assert(results.every(r => r.ok));
});

test('KV outage or write failure still serves live data and short-lived memory cache', async () => {
  const h = harness(null, {
    readCache: async () => { throw Error('KV unavailable'); },
    writeCache: async () => { throw Error('KV write failed'); },
  });
  assert.equal((await h.get()).ok, true);
  assert.equal((await h.get()).cacheStorage, 'memory');
  assert.equal(h.state.calls, 1);
});

test('old records beyond retention are not presented as current data', async () => {
  const h = harness({ cachedAt: 1793145600000 - 86400001, payload: livePayload() }, {
    fetchLive: async () => { throw Error('down'); },
  });
  assert.equal((await h.get()).cache, 'unavailable');
});

test('failure cooldown avoids repeated upstream requests in one isolate', async () => {
  let calls = 0;
  const h = harness(null, { fetchLive: async () => { calls++; throw Error('down'); } });
  await h.get();
  await h.get();
  assert.equal(calls, 1);
  h.state.time += 30000;
  await h.get();
  assert.equal(calls, 2);
});

test('diagnostics are only returned on explicit debug requests', async () => {
  const h = harness();
  assert(!('debug' in await h.get()));
  assert.equal((await h.get({ debug: true })).debug.upstream, true);
});

test('API aliases preserve cache headers and make debug responses non-cacheable', async () => {
  for (const file of ['pages/api/live-status.js', 'pages/api/soop-live-status.js']) {
    const { handler } = load(file, ['handler'], {
      getLiveStatusResponsePayload: async (options) => ({ ok: true, requestedDebug: options.debug }),
    });
    for (const debug of [false, true]) {
      const res = { setHeader(_key, value) { this.header = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      await handler({ query: debug ? { debug: '1' } : {} }, res);
      assert.equal(res.code, 200);
      assert.equal(res.body.requestedDebug, debug);
      assert.equal(res.header, debug ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=600');
    }
  }
});

test('shared snapshot helper prefers KV and falls back to Redis without changing credentials', async () => {
  let redisReads = 0;
  const record = { cachedAt: 1793145599000, payload: livePayload() };
  const kv = { get: async () => record, put: async () => {} };
  const api = load('lib/cloudflareSnapshotCache.js', ['readSnapshotCache', 'writeSnapshotCache'], {
    getCloudflareContext: () => ({ env: { JANGJISU_CACHE: kv } }),
    getCachedJson: async () => { redisReads++; return record; },
    setCachedJson: async () => {}, isRedisConfigured: () => true,
  });
  assert.equal((await api.readSnapshotCache('key')).storage, 'cloudflare-kv');
  assert.equal(redisReads, 0);
  kv.get = async () => { throw Error('down'); };
  assert.equal((await api.readSnapshotCache('key')).storage, 'upstash');
  assert.equal(redisReads, 1);
});

test('fan-site channel enrichment also uses the same shared response cache', async () => {
  let calls = 0;
  const { enrichWithLiveStatus } = load('pages/api/soop.js', ['enrichWithLiveStatus'], {
    getLiveStatusResponsePayload: async () => { calls++; return { ...livePayload(), fetchedAt: '2026-10-28T00:00:00Z' }; },
  });
  const result = await enrichWithLiveStatus({ channel: { id: 'iamquaddurup' } });
  assert.equal(calls, 1);
  assert.equal(result.channel.isLive, true);
  assert.equal(result.liveFetchedAt, '2026-10-28T00:00:00Z');
});
