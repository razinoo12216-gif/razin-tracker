export default function middleware(request) {
  const basicAuth = request.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    if (
      user === process.env.AUTH_USER &&
      pwd === process.env.AUTH_PASSWORD
    ) {
      return;
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="12 World"',
    },
  });
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};
