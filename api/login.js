const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Solo POST ammesso' });
  }

  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM utenti WHERE username = $1 AND password = $2',
      [username, password]
    );

   // Nel tuo file di login, cambia questa parte:
if (result.rows.length > 0) {
  res.setHeader('Set-Cookie', [
    // Rimosso HttpOnly così JS può leggerlo
    `utente_id=${result.rows[0].id}; Path=/`, 
    `username=${result.rows[0].username}; Path=/`
  ]);

  res.status(200).json({ success: true, message: 'Login OK' });
} else {
      res.status(401).json({ success: false, message: 'Credenziali errate' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
};