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
                  html.sou-prison-prepaint header > div,
                  html.sou-prison-prepaint main {
                    max-width: 1120px !important;
                  }
                  html.sou-prison-prepaint main {
                    width: 100% !important;
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
