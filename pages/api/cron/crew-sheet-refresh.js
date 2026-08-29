import { getRuntimeEnvValue } from '../../../lib/youtube-data';
import { createCompactCronResponse } from '../../../lib/compactCronResponse';
import crewSheetHandler from '../crew-sheet';

async function isAuthorized(req) {
  const secret = await getRuntimeEnvValue('CRON_SECRET');
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

export default async function handler(req, res) {
  if (!(await isAuthorized(req))) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const compactResponse = createCompactCronResponse(res, (payload, statusCode) => {
    const crews = Array.isArray(payload.crews) ? payload.crews : [];
    const memberCount = crews.reduce((sum, crew) => sum + (Array.isArray(crew.members) ? crew.members.length : 0), 0);
    return {
      ok: statusCode < 400 && payload.error !== true && crews.length > 0,
      crewCount: crews.length,
      memberCount,
      categoryCount: Array.isArray(payload.categories) ? payload.categories.length : 0,
      cache: payload.cache || 'unknown',
      storage: payload.cacheStorage || 'unknown',
      refreshedAt: payload.cachedAt || payload.updatedAt || new Date().toISOString(),
    };
  });
  return crewSheetHandler(req, compactResponse);
}
