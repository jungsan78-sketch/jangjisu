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
    const pathname = String(this.props.pathname || '');
    const isPrisonPage = pathname.startsWith('/jangjisu-prison');

    return (
      <Html className={isPrisonPage ? 'sou-prison-prepaint' : undefined}>
        <Head>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                html.sou-prison-prepaint header > div,
                html.sou-prison-prepaint main {
                  max-width: 1200px !important;
                }
                html.sou-prison-prepaint main {
                  width: 100% !important;
                }
                html.sou-prison-prepaint section[aria-label="장지수용소 대문"] {
                  display: none !important;
                }
                html.sou-prison-prepaint #members:not(.sou-member-live-section) {
                  display: none !important;
                }
                html.sou-prison-prepaint #sou-react-member-live-grid-root {
                  display: block !important;
                }
                video[src="/hero.mp4"],
                img[src="/jangjisu-prison-hero.png"] {
                  display: none !important;
                }
                @media (prefers-reduced-motion: no-preference) {
                  html.sou-prison-prepaint #schedule *,
                  html.sou-prison-prepaint #members * {
                    animation: none !important;
                    transition-property: border-color, background-color, box-shadow, color !important;
                  }
                }
              `,
            }}
          />
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
