import { PRISON_MANUAL_SCHEDULES } from '../../data/prisonManualSchedules';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const key = String(req.query.key || '').trim();
  const schedule = PRISON_MANUAL_SCHEDULES[key];
  if (!schedule) {
    return res.status(404).json({ ok: false, message: '수동 일정 데이터를 찾지 못했습니다.' });
  }

  const currentMonth = getKstMonthInfo();
  return res.status(200).json({
    ok: true,
    source: 'manual_image_schedule',
    sourceUrl: '',
    member: schedule.member,
    monthLabel: currentMonth.monthLabel,
    items: schedule.items,
    fetchedAt: new Date().toISOString(),
  });
}
