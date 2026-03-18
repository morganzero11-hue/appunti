const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // ==========================================
    // 1. LETTURA APPUNTI (GET)
    // ==========================================
    if (req.method === 'GET') {
        const { utente_id, username } = req.query;

        try {
            // Usiamo LEFT JOIN per unire la tabella appunti con la tabella utenti
            let query = `
                SELECT a.*, u.username, u.nome, u.cognome, u.foto_profilo_url 
                FROM appunti a 
                LEFT JOIN utenti u ON a.utente_id::text = u.id::text
            `;
            let params = [];

            if (username) {
                query += ` WHERE u.username ILIKE $1 ORDER BY a.data_caricamento DESC`;
                params = [username];
            } 
            else if (utente_id) {
                query += ` WHERE a.utente_id = $1 ORDER BY a.data_caricamento DESC`;
                params = [utente_id];
            } 
            else {
                // Pagina Esplora
                query += ` ORDER BY a.data_caricamento DESC`;
            }

            const result = await pool.query(query, params);
            return res.status(200).json(result.rows);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ==========================================
    // 2. CREAZIONE NUOVO APPUNTO (POST)
    // ==========================================
    if (req.method === 'POST') {
        const { utente_id, titolo, materia, file_url } = req.body;
        
        if (!utente_id || !titolo || !file_url) {
            return res.status(400).json({ error: "Dati mancanti" });
        }

        try {
            await pool.query(
                'INSERT INTO appunti (utente_id, titolo, materia, file_url, data_caricamento) VALUES ($1, $2, $3, $4, NOW())',
                [utente_id, titolo, materia, file_url]
            );
            return res.status(201).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ==========================================
    // 3. ELIMINAZIONE APPUNTO (DELETE)
    // ==========================================
    if (req.method === 'DELETE') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: "ID appunto mancante" });
        }

        try {
            await pool.query('DELETE FROM appunti WHERE id = $1', [id]);
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}