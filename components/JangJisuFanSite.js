import { useEffect, useState } from 'react';
import ScheduleHybridSection from './ScheduleHybridSection';

export default function JangJisuFanSite() {
  const [schedule, setSchedule] = useState({
    monthLabel: '일정',
    items: [],
  });

  useEffect(() => {
    let mounted = true;

    const loadSchedule = async () => {
      try {
        const res = await fetch('/api/schedule', { cache: 'no-store' });
        const json = await res.json();

        if (!mounted) return;
        setSchedule({
          monthLabel: json.monthLabel || '일정',
          items: Array.isArray(json.items) ? json.items : [],
        });
      } catch {
        if (!mounted) return;
        setSchedule({ monthLabel: '일정', items: [] });
      }
    };

    loadSchedule();
    const timer = setInterval(loadSchedule, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <ScheduleHybridSection
        monthLabel={schedule.monthLabel}
        items={schedule.items}
      />
    </>
  );
}
