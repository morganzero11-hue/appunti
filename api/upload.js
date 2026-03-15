const { put } = require('@vercel/blob');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { type, userId, titolo, materia, filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: 'Nome file mancante' });
  }

  try {
    // 1. Carica il file su Vercel Blob
    const blob = await put(filename, req, {
      access: 'public',
    });

    const client = await pool.connect();

    if (type === 'profilo') {
      // Aggiorna la foto profilo dell'utente
      await client.query(
        'UPDATE utenti SET foto_profilo_url = $1 WHERE id = $2',
        [blob.url, userId]
      );

    } else if (type === 'appunto') {
      // Inserisce il nuovo appunto nel database
      if (!titolo || !materia || !userId) {
        client.release();
        return res.status(400).json({ error: 'titolo, materia e userId sono obbligatori' });
      }

      await client.query(
        `INSERT INTO appunti (utente_id, titolo, materia, file_url, data_caricamento)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, titolo, materia, blob.url]
      );
    }

    client.release();
    return res.status(200).json({ success: true, url: blob.url });

  } catch (err) {
    console.error('Errore upload:', err);
    return res.status(500).json({ error: 'Errore durante il caricamento', detail: err.message });
  }
};