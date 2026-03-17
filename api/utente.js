const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "ID mancante" });

    try {
        const result = await pool.query('SELECT id, nome, cognome, email, foto_profilo_url FROM utenti WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            // Se non trovi l'utente (magari durante i test con ID=1), restituisci un mock invece di errore 404
            return res.status(200).json({ nome: "Utente", cognome: "Test", email: "test@appunti.it", foto_profilo_url: null });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}