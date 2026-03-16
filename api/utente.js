const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  const { id } = req.query; // Riceve l'id passato da profilo.html

  if (!id) return res.status(400).json({ error: 'ID mancante' });

  try {
    const result = await pool.query(
      'SELECT nome, cognome, email, username FROM utenti WHERE id = $1',
      [id]
    );

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Utente non trovato' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};