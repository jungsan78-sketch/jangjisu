function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeComment(res, comment) {
  res.write(`: ${comment}\n\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  const streamerId = String(req.query.streamerId || '').trim();

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  if (!streamerId || /\s/.test(streamerId)) {
    writeSse(res, { type: 'error', message: 'SOOP 스트리머 아이디가 올바르지 않습니다.' });
    res.end();
    return;
  }

  writeSse(res, {
    type: 'status',
    status: 'ready',
    streamerId,
    source: 'jangjisou-native-prototype-v1',
    message: 'Native 독립 수신기 테스트 준비 상태입니다. 아직 hoxy relay를 사용하지 않는 프로토타입입니다.',
  });

  const startedAt = Date.now();
  const maxMs = 55 * 1000;

  while (Date.now() - startedAt < maxMs) {
    await sleep(15000);
    writeComment(res, 'native ping');
    writeSse(res, {
      type: 'status',
      status: 'waiting',
      streamerId,
      source: 'native',
      at: new Date().toISOString(),
    });
  }

  writeSse(res, { type: 'status', status: 'rotate', streamerId, source: 'native' });
  res.end();
}

export const config = { api: { bodyParser: false } };
