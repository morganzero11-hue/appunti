const { Pool } = require('pg');

// Configurazione database
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // ==========================================
    // 1. LETTURA APPUNTI (GET)
    // ==========================================
    if (req.method === 'GET') {
        const { utente_id, username } = req.query;

        try {
            let result;

            if (username) {
                // Se c'è lo username, uniamo la tabella appunti con la tabella utenti
                result = await pool.query(`
                    SELECT a.* FROM appunti a
                    JOIN utenti u ON a.utente_id = u.id
                    WHERE u.username ILIKE $1
                    ORDER BY a.data_caricamento DESC
                `, [username]);
            } 
            else if (utente_id) {
                // Se c'è l'ID utente (es. per il proprio profilo)
                result = await pool.query(
                    'SELECT * FROM appunti WHERE utente_id = $1 ORDER BY data_caricamento DESC',
                    [utente_id]
                );
            } 
            else {
                // Se non c'è nulla, restituisce tutti gli appunti (per la pagina Esplora)
                result = await pool.query('SELECT * FROM appunti ORDER BY data_caricamento DESC');
            }

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

    // Se si usa un metodo non supportato
    return res.status(405).end();
}