const { getLeaderboard } = require('../lib/store');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const list = await getLeaderboard();
    return res.status(200).json({ ok: true, leaderboard: list });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};
