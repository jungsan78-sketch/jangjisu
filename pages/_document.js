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
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
