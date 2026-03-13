const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true } // Neon richiede SSL
});

module.exports = async (req, res) => {
  // 1. IMPORTANTE: Vercel popola req.body automaticamente se il Content-Type è application/json
  const { username, password } = req.body;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Solo POST ammesso' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM utenti WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ success: true, message: 'Login OK' });
    } else {
      res.status(401).json({ success: false, message: 'Credenziali errate' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
};