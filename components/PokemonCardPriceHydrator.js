import { useEffect } from 'react';

function markPokemonPriceUi() {
  if (typeof window === 'undefined') return;
  const isPokemonPage = window.location.pathname === '/pokemon-card';
  document.body.classList.toggle('sou-pokemon-card-page', isPokemonPage);
  if (!isPokemonPage) return;

  document.querySelectorAll('button.group').forEach((card) => {
    const hasLiveBadge = Array.from(card.querySelectorAll('span')).some((span) => span.textContent?.trim() === 'LIVE');
    if (!hasLiveBadge) return;
    card.classList.add('sou-pokemon-live-card');

    const priceStack = card.querySelector('.font-sans.tabular-nums.space-y-1');
    if (priceStack) {
      priceStack.classList.add('sou-pokemon-current-price');
      priceStack.setAttribute('data-label', '현재가');
    }

    const recentRow = Array.from(card.querySelectorAll('div')).find((node) => node.textContent?.trim().startsWith('최근거래'));
    if (recentRow) recentRow.classList.add('sou-pokemon-recent-price-row');
  });

  document.querySelectorAll('section div').forEach((node) => {
    const text = node.textContent?.trim();
    if (text === '원화') node.textContent = '원화 환산';
    if (text === '엔화') node.textContent = '현재가';
    if (text === '달러') node.textContent = '달러 환산';
    if (text === '변동률') node.textContent = '가격 기준';
  });

  document.querySelectorAll('section span').forEach((node) => {
    const text = node.textContent?.trim();
    if (text?.startsWith('SNKRDUNK 검색어:')) {
      node.textContent = text.replace('SNKRDUNK 검색어:', '검색어:');
      node.classList.add('sou-pokemon-search-keyword');
      const parent = node.parentElement;
      if (parent && !parent.querySelector('.sou-pokemon-search-live-badge')) {
        const badge = document.createElement('span');
        badge.className = 'sou-pokemon-search-live-badge';
        badge.textContent = 'SNKRDUNK LIVE 검색 결과';
        parent.insertBefore(badge, node);
      }
    }
  });
}

export default function PokemonCardPriceHydrator() {
  useEffect(() => {
    markPokemonPriceUi();
    const observer = new MutationObserver(markPokemonPriceUi);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', markPokemonPriceUi);
    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', markPokemonPriceUi);
      document.body.classList.remove('sou-pokemon-card-page');
    };
  }, []);

  return (
    <style jsx global>{`
      .sou-pokemon-card-page .sou-pokemon-live-card .sou-pokemon-current-price {
        position: relative;
        display: block;
        border: 1px solid rgba(125, 211, 252, 0.16);
        border-radius: 16px;
        background: rgba(56, 189, 248, 0.09);
        padding: 30px 12px 11px;
      }

      .sou-pokemon-card-page .sou-pokemon-live-card .sou-pokemon-current-price::before {
        content: attr(data-label);
        position: absolute;
        left: 12px;
        top: 9px;
        color: rgba(186, 230, 253, 0.62);
        font-size: 11px;
        font-weight: 950;
        letter-spacing: -0.01em;
      }

      .sou-pokemon-card-page .sou-pokemon-live-card .sou-pokemon-current-price > div:first-child {
        color: #7dd3fc !important;
      }

      .sou-pokemon-card-page .sou-pokemon-live-card .sou-pokemon-recent-price-row {
        border-color: rgba(255, 255, 255, 0.12) !important;
        background: rgba(0, 0, 0, 0.24) !important;
      }

      .sou-pokemon-card-page .sou-pokemon-search-live-badge {
        border: 1px solid rgba(167, 243, 208, 0.22);
        border-radius: 999px;
        background: rgba(52, 211, 153, 0.12);
        color: #bbf7d0;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 950;
      }

      .sou-pokemon-card-page .sou-pokemon-search-keyword {
        color: rgba(255, 255, 255, 0.55) !important;
      }
    `}</style>
  );
}
