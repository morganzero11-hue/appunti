const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

/* Hash SHA-256 della password — in produzione usa bcrypt */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/* Validazione minima lato server */
function valida({ nome, cognome, username, email, password }) {
  if (!nome || !cognome) return 'Nome e cognome sono obbligatori';
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
    return 'Username non valido (3-30 caratteri, solo lettere, numeri e _)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Email non valida';
  if (!password || password.length < 8)
    return 'La password deve avere almeno 8 caratteri';
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Solo POST ammesso' });
  }

  const { nome, cognome, username, email, password } = req.body;

  /* Validazione */
  const errore = valida({ nome, cognome, username, email, password });
  if (errore) {
    return res.status(400).json({ success: false, message: errore });
  }

  try {
    /* Controlla se username o email sono già in uso */
    const esistente = await pool.query(
      'SELECT id FROM utenti WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );

    if (esistente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username o email già in uso. Prova con un altro.'
      });
    }

    /* Inserisce il nuovo utente */
    await pool.query(
      `INSERT INTO utenti (nome, cognome, username, email, password, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [nome.trim(), cognome.trim(), username.toLowerCase(), email.toLowerCase(), hashPassword(password)]
    );

    return res.status(201).json({
      success: true,
      message: 'Account creato con successo!'
    });

  } catch (err) {
    console.error('Errore registrazione:', err);
    return res.status(500).json({
      success: false,
      message: 'Errore del server. Riprova più tardi.',
      error: err.message
    });
  }
};