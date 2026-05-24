export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { refresh_token } = req.body

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })

  const data = await tokenRes.json()

  if (data.error) {
    return res.status(400).json({ error: data.error_description || data.error })
  }

  return res.status(200).json({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  })
}
