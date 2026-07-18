const URLS = {
  house:  'https://housestockwatcher.com/api/transactions',
  senate: 'https://senatestockwatcher.com/api/transactions',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const chamber = req.query.chamber;
  const url = URLS[chamber];
  if (!url) return res.status(400).json({ error: 'chamber must be house or senate' });

  try {
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate');
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error', detail: String(err) });
  }
}
