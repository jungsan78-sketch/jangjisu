import { useEffect, useRef, useState } from 'react';

const formatCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? `${count.toLocaleString('ko-KR')}명` : '집계 전';
};

const imageUrl = (value) => {
  const url = String(value || '').trim();
  return url.startsWith('//') ? `https:${url}` : url;
};

export default function StreamerAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = '스트리머 이름 추가...',
  className = '',
  inputClassName = '',
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedImages, setFailedImages] = useState({});
  const requestId = useRef(0);
  const query = String(value || '').trim();
  const canSearch = Boolean(query) && !/[\n,]/.test(query);

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return undefined;
    }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const response = await fetch(`/api/soop-streamer-search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = await response.json();
        if (requestId.current !== currentRequest) return;
        setResults(Array.isArray(payload?.results) ? payload.results.slice(0, 5) : []);
      } catch (error) {
        if (error?.name !== 'AbortError' && requestId.current === currentRequest) setResults([]);
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, query]);

  const choose = (candidate) => {
    onSelect?.({ ...candidate, profileImage: imageUrl(candidate.profileImage) });
    setOpen(false);
    setResults([]);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => { if (canSearch) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter' && !open) onSubmit?.();
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full ${inputClassName}`}
      />
      {open && canSearch ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/12 bg-[#07101c] p-1.5 shadow-[0_22px_58px_rgba(0,0,0,0.58)]">
          <div className="px-3 pb-1.5 pt-1 text-[10px] font-black tracking-[0.18em] text-cyan-100/42">SOOP 스트리머 검색</div>
          {results.map((candidate) => {
            const key = candidate.stationId;
            const src = !failedImages[key] ? imageUrl(candidate.profileImage) : '';
            return (
              <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(candidate)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.075]">
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] text-sm font-black text-white/55">
                  {src ? <img src={src} alt="" onError={() => setFailedImages((current) => ({ ...current, [key]: true }))} className="h-full w-full object-cover" /> : candidate.nickname.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><strong className="truncate text-sm font-black text-white">{candidate.nickname}</strong>{candidate.broadNo ? <span className="rounded-full bg-rose-400/16 px-2 py-0.5 text-[9px] font-black text-rose-200">LIVE</span> : null}</span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-white/38">{candidate.stationId}</span>
                </span>
                <span className="shrink-0 text-right"><span className="block text-[10px] font-bold text-white/30">즐겨찾기</span><strong className="mt-0.5 block text-xs font-black text-cyan-100/78">{formatCount(candidate.favoriteCount)}</strong></span>
              </button>
            );
          })}
          {loading ? <div className="px-3 py-4 text-center text-xs font-black text-white/38">검색 중...</div> : null}
          {!loading && !results.length ? <div className="px-3 py-4 text-center text-xs font-black text-white/38">검색 결과가 없습니다. 직접 추가할 수 있어요.</div> : null}
        </div>
      ) : null}
    </div>
  );
}

