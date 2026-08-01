import { getRuntimeEnvValue } from '../../../lib/youtube-data';
import { getReplayMonthWindow, resolveReplayMonth } from '../../../lib/replayMonthWindow';
import { BROADCAST_DATA_MEMBERS, refreshBroadcastDataMember } from '../prison-broadcast-data';

async function isAuthorized(req) {
  const secret = await getRuntimeEnvValue('CRON_SECRET');
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

function scheduledTarget() {
  const refreshSlot = Math.floor(Date.now() / (60 * 60 * 1000));
  return {
    member: BROADCAST_DATA_MEMBERS[refreshSlot % BROADCAST_DATA_MEMBERS.length],
    month: getReplayMonthWindow().find((month) => month.kind === 'current'),
  };
}

export default async function handler(req, res) {
  if (!(await isAuthorized(req))) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const scheduled = scheduledTarget();
  const requestedMemberId = String(req.query?.member || '').trim();
  const member = BROADCAST_DATA_MEMBERS.find((item) => item.id === requestedMemberId) || scheduled.member;
  const month = resolveReplayMonth(req.query?.month) || scheduled.month;
  const force = String(req.query?.force || '') === '1';

  try {
    const result = await refreshBroadcastDataMember(month, member.id, force);
    return res.status(200).json({
      ok: true,
      monthKey: month.monthKey,
      memberId: member.id,
      ready: result.ready,
      stale: result.stale,
      storage: result.storage,
      refreshedAt: new Date().toISOString(),
    });
  } catch {
    return res.status(502).json({ ok: false, error: 'refresh-failed' });
  }
}
