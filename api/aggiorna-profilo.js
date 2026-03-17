const { Pool } = require('pg');

// Connessione al database Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true } // Richiesto da Neon
});

export default async function handler(req, res) {
    // Accettiamo solo richieste POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo non consentito' });
    }

    // Estraiamo i dati che arrivano dal frontend
    const { id, nome, cognome, email, foto_profilo_url } = req.body;

    // L'ID è obbligatorio per sapere chi aggiornare
    if (!id) {
        return res.status(400).json({ error: 'ID utente mancante' });
    }

    try {
        // La query magica con COALESCE
        const query = `
            UPDATE utenti 
            SET 
                nome = COALESCE($1, nome), 
                cognome = COALESCE($2, cognome), 
                email = COALESCE($3, email), 
                foto_profilo_url = COALESCE($4, foto_profilo_url)
            WHERE id = $5
            RETURNING *;
        `;
        
        // I valori da iniettare nella query (in ordine da $1 a $5)
        const values = [nome, cognome, email, foto_profilo_url, id];

        const result = await pool.query(query, values);

        // Se l'ID non esiste nel database
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        // Risposta di successo
        return res.status(200).json({ success: true, user: result.rows[0] });

    } catch (error) {
        console.error("Errore durante l'aggiornamento del profilo:", error);
        return res.status(500).json({ error: "Errore interno del server" });
    }
}