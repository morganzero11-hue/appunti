import { put } from '@vercel/blob';
import { Pool } from 'pg';

// Configurazione Pool (usa le tue variabili d'ambiente)
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  // Recuperiamo i dati dalla query string (es: /api/upload?type=profilo&userId=1)
  const { type, userId, titolo, materia, filename } = req.query;

  try {
    // 1. Carica il file su Vercel Blob
    const blob = await put(filename, req, {
      access: 'public',
    });

    const client = await pool.connect();

    if (type === 'profilo') {
      // Aggiorna la tabella utenti per la foto profilo
      await client.query(
        'UPDATE utenti SET foto_profilo_url = $1 WHERE id = $2',
        [blob.url, userId]
      );
    } else if (type === 'appunto') {
      // Inserisce un nuovo record nella tabella appunti
      await client.query(
        'INSERT INTO appunti (utente_id, titolo, materia, file_url) VALUES ($1, $2, $3, $4)',
        [userId, titolo, materia, blob.url]
      );
    }

    client.release();
    return res.status(200).json({ message: 'Caricamento riuscito', url: blob.url });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore durante l\'upload' });
  }
}