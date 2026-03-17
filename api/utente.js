const { Pool } = require('pg');

// Configurazione database
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "ID mancante" });

    try {
        // AGGIUNTO: la parola "scuola" nell'elenco dei campi da recuperare
        const result = await pool.query(
            'SELECT id, nome, cognome, email, foto_profilo_url, scuola FROM utenti WHERE id = $1', 
            [id]
        );
        
        if (result.rows.length === 0) {
            // Aggiunto "scuola" anche ai dati di test fittizi
            return res.status(200).json({ 
                nome: "Utente", 
                cognome: "Test", 
                email: "test@appunti.it", 
                foto_profilo_url: null,
                scuola: null
            });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}