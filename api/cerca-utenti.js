const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Solo GET ammesso' });
  }

  const q = (req.query.q || '').trim();

  if (!q || q.length < 2) {
    return res.status(400).json({ message: 'Query troppo corta' });
  }

  try {
    // ==========================================
    // SICUREZZA: Prevenzione Fuga di Dati (Data Leak)
    // Ho rimosso la colonna "email". Ora la ricerca restituisce 
    // solo i dati strettamente pubblici.
    // Ho aggiunto "id" perché solitamente serve al frontend per 
    // reindirizzare al profilo corretto cliccando sul risultato.
    // ==========================================
    const result = await pool.query(
      `SELECT
         id,
         username,
         nome,
         cognome,
         foto_profilo_url
       FROM utenti
       WHERE
         username ILIKE $1 OR
         nome     ILIKE $1 OR
         cognome  ILIKE $1 OR
         (nome || ' ' || cognome) ILIKE $1
       ORDER BY nome ASC
       LIMIT 20`,
      [`%${q}%`]
    );

    return res.status(200).json(result.rows);

  } catch (err) {
    console.error('Errore cerca-utenti:', err);
    return res.status(500).json({ message: 'Errore server', error: err.message });
  }
};