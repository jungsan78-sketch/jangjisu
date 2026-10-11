import { useState } from 'react';

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const diff = Math.max(0, now - time);
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${Math.floor(diff / 86400000)}일 전`;
}

function DocumentMark() {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-teal-300/[0.08] text-teal-100/65 shadow-[inset_0_1px_0_rgba(94,234,212,0.08)]" aria-hidden="true">
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M8 13h8M8 17h6" />
      </svg>
    </div>
  );
}

export default function LatestNoticeCard({ item }) {
  const [failedThumbnail, setFailedThumbnail] = useState('');
  const [failedProfile, setFailedProfile] = useState('');
  const hasImage = Boolean(item.thumbnailUrl && failedThumbnail !== item.thumbnailUrl);
  const member = item.member || '장지수';
  const title = String(item.title || '').trim() || '공지사항';
  const summary = String(item.summary || '').trim() || '게시글 내용을 확인해보세요.';
  const relativeTime = formatRelativeTime(item.createdAt);

  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="sou-notice-card group" data-notice-image={hasImage ? 'true' : 'false'} aria-label={`${member} 공지: ${title}`}>
      {hasImage ? (
        <div className="sou-notice-thumbnail">
          <img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedThumbnail(item.thumbnailUrl)} />
        </div>
      ) : <DocumentMark />}
      <div className="sou-notice-copy">
        <h4 className="sou-notice-title"><span>{title}</span></h4>
        <div className="sou-notice-preview"><p>{summary}</p></div>
        <div className="sou-notice-meta">
          <span className="sou-notice-avatar">
            {item.profileImage && failedProfile !== item.profileImage ? (
              <img src={item.profileImage} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedProfile(item.profileImage)} />
            ) : <span aria-hidden="true">{member.slice(0, 1)}</span>}
          </span>
          <span className="sou-notice-author">{member}</span>
          {relativeTime ? <><span className="sou-notice-dot" aria-hidden="true">·</span><span className="sou-notice-time">{relativeTime}</span></> : null}
          <span className="sou-notice-arrow" aria-hidden="true">↗</span>
        </div>
      </div>
      <style jsx>{`
        .sou-notice-card {
          display: flex; gap: 18px; min-width: 0; padding: 18px;
          border-radius: 22px; background: linear-gradient(135deg, #121d2b, #101723);
          box-shadow: inset 0 1px 0 rgba(125,211,252,.07), 0 12px 32px rgba(0,0,0,.16);
          transition: background .2s, box-shadow .2s, transform .2s;
        }
        .sou-notice-card:hover { transform: translateY(-2px); background: linear-gradient(135deg,#162536,#121d2b); box-shadow: inset 0 1px 0 rgba(125,211,252,.12), 0 18px 38px rgba(0,0,0,.23); }
        .sou-notice-card:focus-visible { outline: 2px solid #67d6da; outline-offset: 4px; }
        .sou-notice-thumbnail { position: relative; flex: 0 0 29%; max-width: 184px; min-width: 90px; min-height: 166px; overflow: hidden; border-radius: 15px; background: #0b1420; }
        .sou-notice-thumbnail img { position: absolute; width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
        .sou-notice-card:hover .sou-notice-thumbnail img { transform: scale(1.025); }
        .sou-notice-copy { display: flex; flex-direction: column; gap: 10px; min-width: 0; flex: 1; }
        .sou-notice-title { margin: 0; padding: 10px 13px; border-radius: 11px; background: linear-gradient(110deg,rgba(251,191,36,.17),rgba(251,191,36,.08)); color: #fff0bf; font-size: 19px; font-weight: 800; line-height: 1.4; letter-spacing: -.025em; box-shadow: inset 0 1px 0 rgba(253,230,138,.08); }
        .sou-notice-title span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
        .sou-notice-preview { padding: 10px 13px; border-radius: 11px; background: rgba(45,212,191,.055); color: #d2e9e7; }
        .sou-notice-preview p { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; white-space: pre-line; margin: 0; font-size: 15px; font-weight: 500; line-height: 1.65; }
        .sou-notice-meta { display: flex; align-items: center; gap: 8px; min-width: 0; margin-top: auto; padding-top: 4px; color: #9bb5c8; font-size: 12px; font-weight: 600; }
        .sou-notice-avatar { display: flex; align-items: center; justify-content: center; flex: 0 0 28px; width: 28px; height: 28px; overflow: hidden; border-radius: 50%; background: rgba(103,232,249,.10); color: #c7edf0; }
        .sou-notice-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sou-notice-author { color: #c7edf0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sou-notice-dot { color: #58758a; }
        .sou-notice-time { white-space: nowrap; }
        .sou-notice-arrow { margin-left: auto; color: #769fae; font-size: 16px; }
        @media (max-width: 639px) {
          .sou-notice-card { padding: 13px; gap: 12px; border-radius: 19px; }
          .sou-notice-thumbnail { flex-basis: 28%; min-width: 78px; min-height: 154px; border-radius: 12px; }
          .sou-notice-copy { gap: 8px; }
          .sou-notice-title { padding: 8px 10px; font-size: 16px; }
          .sou-notice-preview { padding: 8px 10px; }
          .sou-notice-preview p { font-size: 14px; line-height: 1.6; }
          .sou-notice-meta { gap: 6px; font-size: 11px; }
          .sou-notice-avatar { flex-basis: 24px; width: 24px; height: 24px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sou-notice-card, .sou-notice-thumbnail img { transition: none; }
          .sou-notice-card:hover, .sou-notice-card:hover .sou-notice-thumbnail img { transform: none; }
        }
      `}</style>
    </a>
  );
}
