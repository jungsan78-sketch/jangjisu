const encoder = new TextEncoder();

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  const streamerId = String(req.query.streamerId || '').trim();
  const demo = String(req.query.demo || '') === '1';

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
    source: 'jangjisou-sse-v1',
  });

  if (demo) {
    await sleep(850);
    writeSse(res, {
      type: 'donation',
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

  // 1차 버전: Hoxy와 같은 SSE 껍데기/클라이언트 연결 검증용입니다.
  // 실제 SOOP 후원 원본 API가 확인되면 이 루프 내부에서 원본을 폴링하고 donation 이벤트를 내려주면 됩니다.
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
