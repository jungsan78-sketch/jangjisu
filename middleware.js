import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const bypass = request.headers.get('x-youtube-cache-bypass') === '1' || request.nextUrl.searchParams.get('live') === '1';

  if (pathname === '/jangjisu-prison') {
    const url = request.nextUrl.clone();
    url.pathname = '/jangjisu-prison-v2';
    return NextResponse.redirect(url, 307);
  }

  if (!bypass && pathname === '/api/youtube') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/youtube-cached';
    return NextResponse.rewrite(url);
  }

  if (!bypass && pathname === '/api/prison-youtube') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/prison-youtube-cached';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/jangjisu-prison', '/api/youtube', '/api/prison-youtube'],
};
