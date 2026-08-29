import { getRuntimeEnvValue } from '../../../lib/youtube-data';
import { createCompactCronResponse } from '../../../lib/compactCronResponse';
import prisonScheduleHandler from '../prison-schedule';

async function isAuthorized(req) {
  const secret = await getRuntimeEnvValue('CRON_SECRET');
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

export default async function handler(req, res) {
  if (!(await isAuthorized(req))) return res.status(401).json({ ok: false, error: 'unauthorized' });
  req.query = {
    year: req.query?.year,
    month: req.query?.month,
  };
  const compactResponse = createCompactCronResponse(res, (payload, statusCode) => ({
    ok: statusCode < 400 && payload.ok !== false && Array.isArray(payload.schedules) && payload.schedules.length > 0,
    monthLabel: payload.monthLabel || '',
    memberCount: Array.isArray(payload.members) ? payload.members.length : 0,
    itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
    cache: payload.cache || 'unknown',
    storage: payload.cacheStorage || 'unknown',
    refreshedAt: payload.cachedAt || payload.fetchedAt || new Date().toISOString(),
  }));
  return prisonScheduleHandler(req, compactResponse);
}
