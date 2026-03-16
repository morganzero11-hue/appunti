const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Solo GET ammesso' });
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username mancante' });
  }

  try {
    const result = await pool.query(
      // DOPO
`SELECT id, username, nome, cognome, email, foto_profilo_url, created_at
 FROM utenti
 WHERE username = $1`,
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Errore utente:', err);
    return res.status(500).json({ message: 'Errore server', error: err.message });
  }
};