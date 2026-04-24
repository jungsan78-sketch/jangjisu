export default function handler(req, res) {
  const clientId = process.env.SOOP_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      ok: false,
      error: 'SOOP_CLIENT_ID is not set',
    });
  }

  const authUrl = `https://openapi.sooplive.com/auth/code?client_id=${encodeURIComponent(clientId)}`;
  return res.redirect(authUrl);
}
