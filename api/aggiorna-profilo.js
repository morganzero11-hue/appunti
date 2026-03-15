const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Solo POST ammesso' });
  }

  // Legge utente_id dal cookie
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/utente_id=(\d+)/);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Non sei loggato' });
  }
  const utenteId = match[1];

  const { nome, cognome, email } = req.body;

  if (!nome || !cognome) {
    return res.status(400).json({ success: false, message: 'Nome e cognome sono obbligatori' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email non valida' });
  }

  try {
    await pool.query(
      `UPDATE utenti
       SET nome = $1, cognome = $2, email = $3
       WHERE id = $4`,
      [nome.trim(), cognome.trim(), email ? email.trim().toLowerCase() : null, utenteId]
    );

    return res.status(200).json({ success: true, message: 'Profilo aggiornato!' });

  } catch (err) {
    console.error('Errore aggiorna-profilo:', err);
    return res.status(500).json({ success: false, message: 'Errore server', error: err.message });
  }
};