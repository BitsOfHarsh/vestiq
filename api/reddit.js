export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const page = req.query.page ?? '1';

  try {
    const upstream = await fetch(
      `https://apewisdom.io/api/v1.0/filter/all-stocks/page/${page}`,
    );
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error', detail: String(err) });
  }
}
