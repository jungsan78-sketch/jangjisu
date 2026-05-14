import Head from 'next/head';
import { useMemo, useState } from 'react';

const BOX_PRODUCTS = [
  {
    id: 'pkmn-129',
    type: 'box',
    code: 'pkmn-129',
    name: 'Pokemon Card Game 25th Anniversary Golden Box',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2021/10/25172024/pokemon-card-game-25th-anniversary-golden-box.jpg',
    krw: '₩3,038,070',
    jpy: '¥320,000',
    usd: '$2,230',
    recent: '₩3,010,000',
    change: '+8.4%',
    source: 'SNKRDUNK 기준 준비중',
  },
  {
    id: 'pkmn-9',
    type: 'box',
    code: 'pkmn-9',
    name: 'Pokemon Card Game Eevee Heroes Booster Box',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2022/10/25162140/pokemon-card-game-sword-shield-eevee-heroes-booster-box.jpg',
    krw: '₩1,726,605',
    jpy: '¥181,800',
    usd: '$1,268',
    recent: '₩1,690,000',
    change: '+5.1%',
    source: 'SNKRDUNK 기준 준비중',
  },
  {
    id: 'pkmn-38',
    type: 'box',
    code: 'pkmn-38',
    name: 'Pokemon Card Game 25th Anniversary Collection Box',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2021/10/25172112/pokemon-card-game-sword-shield-25th-anniversary-collection-box.jpg',
    krw: '₩825,553',
    jpy: '¥86,900',
    usd: '$606',
    recent: '₩812,000',
    change: '+2.7%',
    source: 'SNKRDUNK 기준 준비중',
  },
  {
    id: 'pkmn-tcg-sv2a',
    type: 'box',
    code: 'pkmn-tcg-SV2a',
    name: 'Pokemon Card Game Scarlet & Violet 151 Booster Box',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2023/06/14191533/Pokemon-Card-151-Booster-Box.jpg',
    krw: '₩640,637',
    jpy: '¥67,400',
    usd: '$470',
    recent: '₩628,000',
    change: '+3.2%',
    source: 'SNKRDUNK 기준 준비중',
  },
  {
    id: 'pkmn-vmax-climax',
    type: 'box',
    code: 's8b',
    name: 'Pokemon Card Game VMAX Climax Booster Box',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2021/12/09163412/pokemon-card-game-sword-shield-high-class-pack-vmax-climax-box.jpg',
    krw: '₩518,000',
    jpy: '¥54,500',
    usd: '$380',
    recent: '₩502,000',
    change: '+1.9%',
    source: 'SNKRDUNK 기준 준비중',
  },
  {
    id: 'pkmn-terastal',
    type: 'box',
    code: 'sv8a',
    name: 'Pokemon Card Game Terastal Festival ex Booster Box',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2024/12/03173923/Pokemon-Card-Game-Scarlet-Violet-High-Class-Pack-Terastal-Festival-ex-Booster-Box.jpg',
    krw: '₩214,000',
    jpy: '¥22,500',
    usd: '$157',
    recent: '₩207,000',
    change: '+6.6%',
    source: 'SNKRDUNK 기준 준비중',
  },
];

const CARD_PRODUCTS = [
  {
    id: 'card-mario-pikachu',
    type: 'card',
    code: '294/XY-P',
    name: 'Mario Pikachu Promo Card',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2023/02/02164308/Mario-Pikachu-Pokemon-Card.jpg',
    krw: '₩7,890,000',
    jpy: '¥830,000',
    usd: '$5,790',
    recent: '₩7,620,000',
    change: '+12.2%',
    source: '최근 고가 카드 준비중',
  },
  {
    id: 'card-lillie',
    type: 'card',
    code: 'SR 119/114',
    name: 'Lillie Full Art Trainer Card',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2023/02/02164138/Lillie-Pokemon-Card.jpg',
    krw: '₩5,430,000',
    jpy: '¥571,000',
    usd: '$3,986',
    recent: '₩5,210,000',
    change: '+7.8%',
    source: '최근 고가 카드 준비중',
  },
  {
    id: 'card-umbreon-vmax',
    type: 'card',
    code: 'HR 095/069',
    name: 'Umbreon VMAX Alternate Art',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2022/10/25154348/Umbreon-VMAX.jpg',
    krw: '₩2,180,000',
    jpy: '¥229,500',
    usd: '$1,600',
    recent: '₩2,110,000',
    change: '+4.3%',
    source: '최근 고가 카드 준비중',
  },
  {
    id: 'card-charizard-sar',
    type: 'card',
    code: 'SAR',
    name: 'Charizard ex SAR',
    image: 'https://images.snkrdunk.com/en/magazine/wp-content/uploads/2023/07/24165319/Charizard-ex-SAR.jpg',
    krw: '₩418,000',
    jpy: '¥44,000',
    usd: '$307',
    recent: '₩405,000',
    change: '+3.5%',
    source: '최근 고가 카드 준비중',
  },
];

function ProductCard({ item, onSelect }) {
  return (
    <button onClick={() => onSelect(item)} className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#15171c] text-left shadow-[0_24px_80px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-sky-200/35 hover:bg-[#191c22]">
      <div className="relative flex aspect-[1.16] items-center justify-center overflow-hidden bg-[#25272d] p-4">
        <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-[1.045]" />
        <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-lg text-white ring-1 ring-white/15">♡</span>
      </div>
      <div className="p-5">
        <div className="text-[12px] font-black tracking-[0.08em] text-white/38">{item.code}</div>
        <div className="mt-2 line-clamp-2 min-h-[52px] text-[17px] font-black leading-[26px] text-white">{item.name}</div>
        <div className="mt-4 space-y-1.5">
          <div className="text-[24px] font-black tracking-tight text-sky-400">{item.krw}</div>
          <div className="text-[14px] font-bold text-white/62">{item.jpy}</div>
          <div className="text-[14px] font-bold text-white/45">{item.usd}</div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[16px] border border-white/10 bg-black/22 px-3 py-2">
          <span className="text-[11px] font-black text-white/45">최근거래</span>
          <span className="text-[12px] font-black text-white/80">{item.recent}</span>
        </div>
      </div>
    </button>
  );
}

function DetailPanel({ item }) {
  const chartBars = [32, 44, 39, 58, 51, 72, 64, 76, 69, 84, 78, 91];
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] lg:p-7">
      <div className="grid gap-7 lg:grid-cols-[380px_1fr]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#202329] p-7">
          <img src={item.image} alt={item.name} className="mx-auto max-h-[320px] w-full object-contain" />
        </div>
        <div>
          <div className="text-[12px] font-black tracking-[0.14em] text-sky-200/50">{item.code}</div>
          <h2 className="mt-2 text-[28px] font-black leading-tight text-white lg:text-[38px]">{item.name}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-sky-200/15 bg-sky-400/10 p-4"><div className="text-xs font-black text-white/42">원화</div><div className="mt-1 text-2xl font-black text-sky-300">{item.krw}</div></div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="text-xs font-black text-white/42">엔화</div><div className="mt-1 text-2xl font-black text-white">{item.jpy}</div></div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="text-xs font-black text-white/42">달러</div><div className="mt-1 text-2xl font-black text-white/76">{item.usd}</div></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4"><div className="text-xs font-black text-white/42">최근 거래가</div><div className="mt-1 text-xl font-black text-white">{item.recent}</div></div>
            <div className="rounded-[22px] border border-emerald-200/15 bg-emerald-400/10 p-4"><div className="text-xs font-black text-white/42">변동률</div><div className="mt-1 text-xl font-black text-emerald-200">{item.change}</div></div>
          </div>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm font-semibold text-white/58">실시간 SNKRDUNK 연동 전 레이아웃입니다. 다음 단계에서 검색/상세/차트 데이터 연결 방식을 붙입니다.</div>
        </div>
      </div>
      <div className="mt-7 rounded-[28px] border border-white/10 bg-[#090d14] p-5">
        <div className="mb-4 flex items-center justify-between"><div className="text-xl font-black text-white">시세 차트</div><div className="text-xs font-black text-white/38">1D · 7D · 30D · 90D</div></div>
        <div className="flex h-[190px] items-end gap-3 rounded-[20px] bg-[linear-gradient(180deg,rgba(14,165,233,0.07),rgba(0,0,0,0.12))] p-5">
          {chartBars.map((height, index) => <div key={index} className="flex-1 rounded-t-lg bg-sky-400/55 shadow-[0_0_18px_rgba(56,189,248,0.20)]" style={{ height: `${height}%` }} />)}
        </div>
      </div>
    </section>
  );
}

export default function PokemonCardPage() {
  const [tab, setTab] = useState('box');
  const [query, setQuery] = useState('');
  const products = tab === 'box' ? BOX_PRODUCTS : CARD_PRODUCTS;
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(keyword));
  }, [products, query]);
  const [selected, setSelected] = useState(BOX_PRODUCTS[0]);

  const handleTab = (nextTab) => {
    setTab(nextTab);
    setSelected(nextTab === 'box' ? BOX_PRODUCTS[0] : CARD_PRODUCTS[0]);
  };

  return (
    <>
      <Head>
        <title>포켓몬카드 모드 | 장지수 팬 아카이브</title>
        <meta name="description" content="SNKRDUNK 기반 포켓몬 카드 박스와 싱글카드 시세판" />
      </Head>
      <main className="min-h-screen bg-[#05070c] px-5 py-8 text-white lg:px-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-24 left-10 h-80 w-80 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="absolute right-[-80px] top-24 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute bottom-[-120px] left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1480px]">
          <header className="mb-7 flex flex-col gap-5 rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.32)] lg:flex-row lg:items-center lg:justify-between lg:p-8">
            <div>
              <a href="/" className="mb-4 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black text-white/60 transition hover:bg-white/10">← 팬 아카이브로</a>
              <div className="text-[38px] font-black tracking-tight text-white lg:text-[54px]">🎴 포켓몬카드 모드</div>
              <p className="mt-2 text-sm font-bold text-white/45 lg:text-base">SNKRDUNK 스타일의 포켓몬 박스/싱글카드 시세판 · 원화/엔화/달러 · 최근거래 · 시세차트</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4"><div className="text-xs font-black text-white/38">상자 목록</div><div className="mt-1 text-2xl font-black text-white">{BOX_PRODUCTS.length}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4"><div className="text-xs font-black text-white/38">고가 카드</div><div className="mt-1 text-2xl font-black text-white">{CARD_PRODUCTS.length}</div></div>
              <div className="rounded-[22px] border border-amber-200/15 bg-amber-400/10 p-4"><div className="text-xs font-black text-white/38">연동</div><div className="mt-1 text-2xl font-black text-amber-100">준비중</div></div>
            </div>
          </header>

          <section className="mb-7 rounded-[32px] border border-white/10 bg-[#10131a] p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleTab('box')} className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${tab === 'box' ? 'border-yellow-200/35 bg-yellow-400/18 text-yellow-100' : 'border-white/10 bg-white/5 text-white/58 hover:bg-white/10'}`}>상자</button>
                <button onClick={() => handleTab('card')} className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${tab === 'card' ? 'border-sky-200/35 bg-sky-400/18 text-sky-100' : 'border-white/10 bg-white/5 text-white/58 hover:bg-white/10'}`}>카드</button>
                <button className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-white/58">최근거래</button>
                <button className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-white/58">급등</button>
              </div>
              <div className="relative lg:w-[480px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="리자몽 SAR, 피카츄, 151, 골든박스" className="w-full rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-sky-200/35" /></div>
            </div>
          </section>

          <div className="grid gap-7 xl:grid-cols-[1fr_520px]">
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><div className="text-[28px] font-black text-white">{tab === 'box' ? '상자 목록' : '최근 비싼 카드'}</div><div className="mt-1 text-sm font-bold text-white/40">이미지 / 상품명 / 원화 / 엔화 / 달러 / 최근거래가</div></div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/45">{filtered.length}개</div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((item) => <ProductCard key={item.id} item={item} onSelect={setSelected} />)}
              </div>
            </section>
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <DetailPanel item={selected} />
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
