function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeComment(res, comment) {
  res.write(`: ${comment}\n\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRelayPayload(payload, streamerId) {
  if (!payload || payload.type !== 'donation') return null;
  const fromUsername = String(payload.fromUsername || payload.nickname || payload.name || '').trim();
  const amount = Number(payload.amount || payload.count || 0);
  if (!fromUsername || !Number.isFinite(amount) || amount <= 0) return null;

  return {
    type: 'donation',
    kind: payload.kind || 'normalBalloon',
    id: String(payload.id || `hoxy-${streamerId}-${fromUsername}-${amount}-${Date.now()}`),
    fromUsername,
    message: String(payload.message || fromUsername).trim(),
    amount,
    createdAt: payload.createdAt || new Date().toISOString(),
    streamerId,
    relay: 'hoxy',
  };
}

async function relayHoxyStream({ streamerId, res, signal }) {
  const hoxyUrl = `https://calm-hoxy.vercel.app/api/soop-balloon-check?streamerId=${encodeURIComponent(streamerId)}`;
  const response = await fetch(hoxyUrl, {
    headers: {
      Accept: 'text/event-stream',
      'User-Agent': 'jangjisou-soop-funding-relay/1.0',
    },
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Hoxy relay failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastPingAt = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const lines = block.split('\n');

      for (const line of lines) {
        if (line.startsWith(':')) {
          const now = Date.now();
          if (now - lastPingAt > 10000) {
            writeComment(res, 'relay ping');
            lastPingAt = now;
          }
          continue;
        }
        if (!line.startsWith('data: ')) continue;

        let payload = null;
        try {
          payload = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        if (payload.type === 'status') {
          writeSse(res, {
            type: 'status',
            status: payload.status || 'ready',
            streamerId,
            relay: 'hoxy',
          });
          continue;
        }

        const donation = normalizeRelayPayload(payload, streamerId);
        if (donation) {
          writeSse(res, donation);
        }
      }

      sep = buffer.indexOf('\n\n');
    }
  }
}

export default async function handler(req, res) {
  const streamerId = String(req.query.streamerId || '').trim();
  const demo = String(req.query.demo || '') === '1';
  const relay = String(req.query.relay || 'hoxy') === 'hoxy';

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  if (!streamerId || /\s/.test(streamerId)) {
    writeSse(res, {
      type: 'error',
      message: 'SOOP 스트리머 아이디가 올바르지 않습니다.',
    });
    res.end();
    return;
  }

  writeSse(res, {
    type: 'status',
    status: 'ready',
    streamerId,
    source: relay ? 'jangjisou-hoxy-relay-v1' : 'jangjisou-sse-v1',
  });

  if (demo) {
    await sleep(850);
    writeSse(res, {
      type: 'donation',
      kind: 'normalBalloon',
      id: `demo-${Date.now()}-1000`,
      fromUsername: '테스트후원',
      message: '테스트후원',
      amount: 1000,
      createdAt: new Date().toISOString(),
      streamerId,
      demo: true,
    });

    await sleep(1200);
    writeSse(res, {
      type: 'donation',
      kind: 'normalBalloon',
      id: `demo-${Date.now()}-10000`,
      fromUsername: '장지수',
      message: '장지수',
      amount: 10000,
      createdAt: new Date().toISOString(),
      streamerId,
      demo: true,
    });

    await sleep(500);
    writeSse(res, {
      type: 'status',
      status: 'done',
      streamerId,
    });
    res.end();
    return;
  }

  if (relay) {
    const ac = new AbortController();
    const closeRelay = () => ac.abort();
    req.on('close', closeRelay);

    try {
      await relayHoxyStream({ streamerId, res, signal: ac.signal });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        writeSse(res, {
          type: 'error',
          message: 'Hoxy relay 연결에 실패했습니다.',
          detail: error?.message || 'unknown',
          streamerId,
        });
      }
    } finally {
      req.off?.('close', closeRelay);
      res.end();
    }
    return;
  }

  const startedAt = Date.now();
  const maxMs = 55 * 1000;

  while (Date.now() - startedAt < maxMs) {
    await sleep(15000);
    writeSse(res, {
      type: 'status',
      status: 'waiting',
      streamerId,
      at: new Date().toISOString(),
    });
  }

  writeSse(res, {
    type: 'status',
    status: 'rotate',
    streamerId,
  });
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
