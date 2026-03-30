const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Libreria sicura per leggere l'hash
const jwt = require('jsonwebtoken'); // Libreria per i Token di sicurezza

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

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
    // 3. Cerchiamo l'utente nel database
    // NOVITÀ: Estraiamo la "password" (l'hash salvato nel DB) e la "foto_profilo_url"
    const result = await pool.query(
      'SELECT id, username, password, foto_profilo_url FROM utenti WHERE username = $1',
      [username.toLowerCase().trim()]
    );

    // 4. Se l'utente non esiste, fermiamo tutto
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username o password errati' });
    }

    const utente = result.rows[0];

    // 5. NOVITÀ: Confrontiamo la password scritta dall'utente con l'hash salvato nel DB
    const passwordCorretta = await bcrypt.compare(password, utente.password);

    if (passwordCorretta) {
      
      // 6. NOVITÀ: Creiamo un Token JWT sicuro
      // NOTA: Aggiungi JWT_SECRET nelle variabili d'ambiente del tuo server/Vercel
      const secret = process.env.JWT_SECRET || 'chiave_segreta_temporanea_da_cambiare_subito';
      const token = jwt.sign({ utente_id: utente.id, username: utente.username }, secret, { expiresIn: '7d' });

      // 7. Impostiamo i cookie
      // Il cookie "token" è impostato su HttpOnly: significa che JavaScript non può leggerlo
      // (nessun hacker può rubarlo), ma il browser lo invierà in automatico ad ogni richiesta API.
      res.setHeader('Set-Cookie', [
        `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
        `utente_id=${utente.id}; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
        `username=${utente.username}; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
      ]);

      return res.status(200).json({ 
        success: true, 
        message: 'Login effettuato con successo',
        foto_profilo_url: utente.foto_profilo_url // NOVITÀ: Utile per il tuo frontend!
      });
    } else {
      // Password sbagliata
      return res.status(401).json({ success: false, message: 'Username o password errati' });
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