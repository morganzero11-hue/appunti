const { Pool } = require('pg');

// Configurazione database
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    // Estraiamo sia l'id che lo username dalla richiesta
    const { id, username } = req.query;

    if (!id && !username) {
        return res.status(400).json({ error: "Specificare ID o Username" });
    }

    try {
        let result;
        
        // Se c'è lo username, cerchiamo per username (ignorando maiuscole/minuscole)
        if (username) {
            result = await pool.query(
                'SELECT id, username, nome, cognome, email, foto_profilo_url, scuola, created_at FROM utenti WHERE username ILIKE $1', 
                [username]
            );
        } 
        // Altrimenti cerchiamo per ID
        else {
            result = await pool.query(
                'SELECT id, username, nome, cognome, email, foto_profilo_url, scuola, created_at FROM utenti WHERE id = $1', 
                [id]
            );
        }
        
        // Se non troviamo nessuno, restituiamo 404 Not Found
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Utente non trovato" });
        }
        
        // Restituiamo i dati dell'utente trovato
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}