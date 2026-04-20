import { isServerCacheEnabled } from '../../lib/server-cache';

function hasAny(names) {
  return names.some((name) => Boolean(process.env[name]));
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    ok: true,
    deployedAt: new Date().toISOString(),
    serverCacheEnabled: isServerCacheEnabled(),
    env: {
      hasUpstashUrl: hasAny([
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_KV_REST_API_URL',
        'UPSTASH_REDIS_REST_KV_REST_URL',
      ]),
      hasUpstashToken: hasAny([
        'UPSTASH_REDIS_REST_TOKEN',
        'UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
        'UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN',
      ]),
      hasKvUrl: hasAny(['KV_REST_API_URL', 'KV_REST_URL']),
      hasKvToken: hasAny(['KV_REST_API_TOKEN', 'KV_REST_API_READ_ONLY_TOKEN']),
    },
  });
}
