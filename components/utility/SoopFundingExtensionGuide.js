export default function SoopFundingExtensionGuide() {
  const extensionPath = '/extensions/soop-funding-collector/';

  return (
    <section className="relative mx-auto max-w-[1780px] px-5 pt-5 lg:px-8">
      <div className="rounded-[28px] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(255,255,255,0.035))] p-4 shadow-2xl shadow-black/20">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/45">Chrome extension</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">SOOP 채팅 수집은 확장 프로그램으로 연결합니다</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
              F12나 콘솔 입력 없이, 확장 프로그램에서 열려 있는 SOOP 방송 탭을 고르고 선택한 1개 방송만 자동메모장으로 전송합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={extensionPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-cyan-200/35 bg-cyan-300/18 px-5 py-3 text-sm font-black text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300/24"
            >
              확장 프로그램 폴더 열기
            </a>
            <a
              href="https://github.com/jungsan78-sketch/jangjisu/tree/soop-funding-chrome-extension-ver64/public/extensions/soop-funding-collector"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.09]"
            >
              GitHub에서 보기
            </a>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs font-bold leading-5 text-white/45 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/22 p-3"><span className="text-cyan-100/80">1.</span> Chrome에서 <b>chrome://extensions</b> 접속 후 개발자 모드를 켭니다.</div>
          <div className="rounded-2xl border border-white/10 bg-black/22 p-3"><span className="text-cyan-100/80">2.</span> `압축해제된 확장 프로그램 로드`로 <b>soop-funding-collector</b> 폴더를 선택합니다.</div>
          <div className="rounded-2xl border border-white/10 bg-black/22 p-3"><span className="text-cyan-100/80">3.</span> SOOP 방송 탭을 열고 확장 아이콘에서 수집할 방송 1개를 선택합니다.</div>
        </div>
      </div>
    </section>
  );
}
