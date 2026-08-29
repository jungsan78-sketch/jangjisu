import { getRuntimeEnvValue } from '../../../lib/youtube-data';
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
  return crewSheetHandler(req, res);
}

