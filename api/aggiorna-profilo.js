const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { id, nome, cognome, email } = req.body;

  try {
    // Aggiorna le colonne del database basate sul tuo DBeaver
    await pool.query(
      'UPDATE utenti SET nome = $1, cognome = $2, email = $3 WHERE id = $4',
      [nome, cognome, email, id]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};