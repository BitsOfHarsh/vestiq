export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.WHALEWISDOM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'WHALEWISDOM_API_KEY not set on server' });

  const { path, ...rest } = req.query;
  if (!path) return res.status(400).json({ error: 'path param required' });

  const q = new URLSearchParams({ ...rest, api_key: apiKey }).toString();
  const url = `https://whalewisdom.com/api${path}?${q}`;

  try {
    const upstream = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error', detail: String(err) });
  }
}
