import { PRISON_MANUAL_SCHEDULES } from '../../data/prisonManualSchedules';
import { getAllowedScheduleMonth } from '../../lib/scheduleMonth';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const key = String(req.query.key || '').trim();
  const schedule = PRISON_MANUAL_SCHEDULES[key];
  if (!schedule) {
    return res.status(404).json({ ok: false, message: '수동 일정 데이터를 찾지 못했습니다.' });
  }

  const selectedMonth = getAllowedScheduleMonth(req.query, 2);
  if (!selectedMonth) {
    return res.status(400).json({ ok: false, message: '이번 달과 이전 두 달 일정만 확인할 수 있습니다.' });
  }
  const items = schedule.items.filter((item) => Number(item.year) === selectedMonth.year && Number(item.month) === selectedMonth.month);
  return res.status(200).json({
    ok: true,
    source: 'manual_image_schedule',
    sourceUrl: '',
    member: schedule.member,
    monthLabel: selectedMonth.monthLabel,
    items,
    fetchedAt: new Date().toISOString(),
  });
}
