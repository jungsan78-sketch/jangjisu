import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return {
      ...initialProps,
      pathname: ctx.pathname || '',
    };
  }

  render() {
    const isPrisonPage = String(this.props.pathname || '').startsWith('/jangjisu-prison');

    return (
      <Html className={isPrisonPage ? 'sou-prison-prepaint' : undefined}>
        <Head>
          {isPrisonPage ? (
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  html.sou-prison-prepaint #members {
                    position: relative !important;
                    min-height: 230px !important;
                    overflow: hidden !important;
                    border: 1px solid rgba(255,255,255,.10) !important;
                    border-radius: 28px !important;
                    background: radial-gradient(circle at top left, rgba(34,211,238,.12), transparent 34%), linear-gradient(180deg, rgba(17,24,39,.76), rgba(5,9,16,.97)) !important;
                    box-shadow: 0 18px 44px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04) !important;
                  }
                  html.sou-prison-prepaint #members > * {
                    visibility: hidden !important;
                  }
                  html.sou-prison-prepaint #members::before {
                    content: "멤버표 개편 준비중";
                    position: absolute;
                    left: 28px;
                    top: 28px;
                    z-index: 2;
                    color: #fff;
                    font-size: clamp(24px, 3vw, 38px);
                    font-weight: 950;
                    letter-spacing: -.04em;
                  }
                  html.sou-prison-prepaint #members::after {
                    content: "TEST 브랜치에서는 기존 멤버표와 라이브 호출을 임시 중단했습니다.";
                    position: absolute;
                    left: 28px;
                    right: 28px;
                    top: 84px;
                    z-index: 2;
                    color: rgba(255,255,255,.62);
                    font-size: 14px;
                    font-weight: 800;
                    line-height: 1.8;
                  }
                  html.sou-prison-prepaint #schedule .grid.grid-cols-7.gap-3 {
                    animation: none !important;
                  }
                  html.sou-prison-prepaint #schedule .grid.grid-cols-7.gap-3 > div {
                    transition: border-color .14s ease, background-color .14s ease, box-shadow .14s ease !important;
                  }
                `,
              }}
            />
          ) : null}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
