const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Usa la stringa di Neon
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // Gestiamo solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { username, password } = req.body;

  try {
    const client = await pool.connect();
    // Cerchiamo l'utente nel database
    const result = await client.query(
      'SELECT * FROM utenti WHERE username = $1 AND password = $2',
      [username, password]
    );
    client.release();

    if (result.rows.length > 0) {
      // Successo
      res.status(200).json({ success: true, message: 'Login effettuato!' });
    } else {
      // Credenziali errate
      res.status(401).json({ success: false, message: 'Username o password errati' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};