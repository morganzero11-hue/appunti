const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  // Cerchiamo l'ID dai cookie o dalla query
  const utenteId = req.cookies?.utente_id || req.query.id;

  if (!utenteId) return res.status(401).json({ error: 'Non autenticato' });

  try {
    const result = await pool.query(
      'SELECT id, username, nome, cognome, email, foto_profilo_url FROM utenti WHERE id = $1',
      [utenteId]
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