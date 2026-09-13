// api/universities.js
// Proxies the free, keyless Hipolabs "Universities" dataset (http-only,
// so it can't be called directly from an https page — this function
// fetches it server-side and returns JSON over our own https domain).
module.exports = async (req, res) => {
  const query = (req.query.name || '').trim();
  if (query.length < 2) {
    return res.status(200).json([]);
  }

  try {
    const upstream = await fetch(
      'http://universities.hipolabs.com/search?name=' + encodeURIComponent(query)
    );
    const data = await upstream.json();
    const results = data.slice(0, 12).map((u) => ({
      name: u.name,
      country: u.country
    }));
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).json(results);
  } catch (err) {
    console.error('Universities API xətası:', err);
    return res.status(200).json([]);
  }
};
