const { Pool } = require('pg');

// Configurazione del database (ssl è richiesto da servizi come Neon)
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

export default async function handler(req, res) {
    // ---------------------------------------------------------
    // 1. GESTIONE POST: Salva un nuovo appunto nel database
    // ---------------------------------------------------------
    if (req.method === 'POST') {
        const { utente_id, titolo, materia, file_url } = req.body;
        
        try {
            await pool.query(
                'INSERT INTO appunti (utente_id, titolo, materia, file_url) VALUES ($1, $2, $3, $4)',
                [utente_id, titolo, materia, file_url]
            );
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("Errore inserimento:", err);
            return res.status(500).json({ error: err.message });
        }
        
    // ---------------------------------------------------------
    // 2. GESTIONE GET: Recupera gli appunti dal database
    // ---------------------------------------------------------
    } else if (req.method === 'GET') {
        // Estraiamo utente_id dai parametri dell'URL (se c'è)
        const { utente_id } = req.query;

        try {
            let result;
            
            if (utente_id) {
                // Se è stato passato un utente_id (siamo nel Profilo), filtra la ricerca
                result = await pool.query(
                    'SELECT * FROM appunti WHERE utente_id = $1 ORDER BY data_caricamento DESC',
                    [utente_id]
                );
            } else {
                // Se non c'è utente_id (siamo in Esplora), prendili tutti
                result = await pool.query(
                    'SELECT * FROM appunti ORDER BY data_caricamento DESC'
                );
            }
            
            return res.status(200).json(result.rows);
        } catch (err) {
            console.error("Errore recupero:", err);
            return res.status(500).json({ error: err.message });
        }
        
    // ---------------------------------------------------------
    // 3. SE IL METODO NON È POST O GET
    // ---------------------------------------------------------
    } else {
        return res.status(405).json({ error: "Metodo non consentito" });
    }
}