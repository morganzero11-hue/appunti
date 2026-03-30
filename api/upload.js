import { put } from '@vercel/blob';
import jwt from 'jsonwebtoken'; // Ci serve per leggere il "pass" creato nel login

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // ==========================================
    // 1. SICUREZZA: Verifica Autenticazione (Token JWT)
    // ==========================================
    const cookieHeader = req.headers.cookie || '';
    
    // Cerchiamo il cookie "token" che abbiamo impostato nel file login.js
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);

    if (!tokenMatch) {
      return res.status(401).json({ error: 'Non autorizzato. Devi fare il login per caricare file.' });
    }

    const token = tokenMatch[1];
    const secret = process.env.JWT_SECRET || 'chiave_segreta_temporanea_da_cambiare_subito';

    try {
      // Verifichiamo che il token sia reale e non sia stato falsificato
      jwt.verify(token, secret);
    } catch (err) {
      return res.status(403).json({ error: 'Token non valido o scaduto. Effettua di nuovo il login.' });
    }

    // ==========================================
    // 2. SICUREZZA: Validazione Formato File
    // ==========================================
    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ error: 'Nome del file mancante.' });
    }

    // Estraiamo l'estensione dal nome del file (es: da "appunti.pdf" prende "pdf")
    const estensione = filename.split('.').pop().toLowerCase();
    
    // Decidi tu quali formati accettare. Qui ho messo PDF, Immagini e Audio.
    const estensioniAmmesse = ['pdf', 'png', 'jpg', 'jpeg', 'mp3'];

    if (!estensioniAmmesse.includes(estensione)) {
      return res.status(400).json({
        error: `Formato non supportato. Puoi caricare solo: ${estensioniAmmesse.join(', ')}`
      });
    }

    // ==========================================
    // 3. SICUREZZA: Limite Dimensioni (Massimo 10 MB)
    // ==========================================
    // Leggiamo quanto è grande la richiesta in arrivo
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const MAX_SIZE = 10 * 1024 * 1024; // 10 Megabyte convertiti in Byte

    if (contentLength > MAX_SIZE) {
      return res.status(413).json({ error: 'Il file è troppo grande. Il limite massimo è di 10MB.' });
    }

    // ==========================================
    // 4. UPLOAD EFFETTIVO SU VERCEL BLOB
    // ==========================================
    // Se ha superato tutti i controlli, carichiamo il file
    const blob = await put(filename, req, {
      access: 'public',
    });

    return res.status(200).json(blob);

  } catch (error) {
    console.error('Errore Upload:', error);
    return res.status(500).json({ error: 'Errore interno durante il caricamento', dettagli: error.message });
  }
}