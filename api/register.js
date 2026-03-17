const { Pool } = require('pg');
const crypto = require('crypto');

/* Neon usa DATABASE_URL — identico a login.js */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

/* Hash SHA-256 della password — in produzione usa bcrypt */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/* Validazione aggiornata lato server */
function valida({ nome, cognome, username, email, password }) {
  if (!nome || !cognome) return 'Nome e cognome sono obbligatori';
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
    return 'Username non valido (3-30 caratteri, solo lettere, numeri e _)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Email non valida';
  
  // Nuovo controllo password (8 car, 1 num, 1 speciale)
  const pwdRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!password || !pwdRegex.test(password))
    return 'La password deve contenere almeno 8 caratteri, un numero e un carattere speciale';
  
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Solo POST ammesso' });
  }

  // Estraiamo anche 'scuola' dal corpo della richiesta
  const { nome, cognome, username, email, password, scuola } = req.body;

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

    /* Inserisce il nuovo utente, includendo il campo SCUOLA (che può essere vuoto/null) */
    // Gestiamo il caso in cui scuola sia undefined
    const scuolaValue = scuola && scuola.trim() !== '' ? scuola.trim() : null;

    await pool.query(
      `INSERT INTO utenti (nome, cognome, username, email, password, scuola, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [nome.trim(), cognome.trim(), username.toLowerCase(), email.toLowerCase(), hashPassword(password), scuolaValue]
    );

    return res.status(201).json({
      success: true,
      message: 'Account creato con successo!'
    });

  } catch (err) {
    console.error('Errore registrazione dettagliato:', err);
    return res.status(500).json({
      success: false,
      message: 'Errore del server: ' + err.message
    });
  }
};