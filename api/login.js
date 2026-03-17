const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

/**
 * IMPORTANTE: Questa funzione deve essere IDENTICA a quella 
 * usata nel file register.js, altrimenti gli hash non coincideranno mai.
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = async (req, res) => {
  // 1. Accettiamo solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Solo POST ammesso' });
  }

  const { username, password } = req.body;

  // 2. Controllo input basico
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username e password richiesti' });
  }

  try {
    // 3. Trasformiamo la password inserita dall'utente nello stesso hash salvato nel DB
    const passwordHashata = hashPassword(password);

    // 4. Cerchiamo l'utente nel database (usiamo username minuscolo per coerenza)
    const result = await pool.query(
      'SELECT id, username FROM utenti WHERE username = $1 AND password = $2',
      [username.toLowerCase().trim(), passwordHashata]
    );

    // 5. Verifica del risultato
    if (result.rows.length > 0) {
      const utente = result.rows[0];

      // Impostiamo i cookie per il browser
      // Nota: Ho aggiunto "SameSite=Lax" per compatibilità moderna
      res.setHeader('Set-Cookie', [
        `utente_id=${utente.id}; Path=/; SameSite=Lax`,
        `username=${utente.username}; Path=/; SameSite=Lax`
      ]);

      return res.status(200).json({ 
        success: true, 
        message: 'Login effettuato con successo' 
      });
    } else {
      // Se non trova corrispondenza, le credenziali sono sbagliate
      return res.status(401).json({ 
        success: false, 
        message: 'Username o password errati' 
      });
    }

  } catch (err) {
    console.error('Errore Login:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server', 
      error: err.message 
    });
  }
};