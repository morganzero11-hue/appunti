const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { utente_id, titolo, materia, file_url } = req.body;
        try {
            await pool.query(
                'INSERT INTO appunti (utente_id, titolo, materia, file_url) VALUES ($1, $2, $3, $4)',
                [utente_id, titolo, materia, file_url]
            );
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else if (req.method === 'GET') {
        // Recupera tutti gli appunti per la pagina "Esplora"
        try {
            const result = await pool.query('SELECT * FROM appunti ORDER BY data_ricaricamento DESC');
            res.status(200).json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}