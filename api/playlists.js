const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // GET: Recupera le playlist dell'utente
    if (req.method === 'GET') {
        const { utente_id } = req.query;
        if (!utente_id) return res.status(400).json({ error: "Utente ID mancante" });

        try {
            const query = `
                SELECT p.*, COUNT(pe.id) as numero_appunti 
                FROM playlists p
                LEFT JOIN playlist_elementi pe ON p.id = pe.playlist_id
                WHERE p.utente_id = $1
                GROUP BY p.id
                ORDER BY p.data_creazione DESC
            `;
            const result = await pool.query(query, [utente_id]);
            return res.status(200).json(result.rows);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST: Unico comando per CREARE o SALVARE
    if (req.method === 'POST') {
        const { utente_id, titolo, playlist_id, appunto_id } = req.body;

        // CASO A: Se mi mandi playlist_id e appunto_id -> Salva l'appunto nella cartella
        if (playlist_id && appunto_id) {
            try {
                const check = await pool.query('SELECT * FROM playlist_elementi WHERE playlist_id = $1 AND appunto_id = $2', [playlist_id, appunto_id]);
                if (check.rows.length > 0) return res.status(400).json({ error: "Già presente nella playlist!" });

                await pool.query('INSERT INTO playlist_elementi (playlist_id, appunto_id) VALUES ($1, $2)', [playlist_id, appunto_id]);
                return res.status(201).json({ success: true });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        // CASO B: Se mi mandi utente_id e titolo -> Crea una nuova cartella
        if (utente_id && titolo) {
            try {
                await pool.query('INSERT INTO playlists (utente_id, titolo) VALUES ($1, $2)', [utente_id, titolo]);
                return res.status(201).json({ success: true });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        return res.status(400).json({ error: "Dati mancanti" });
    }

    return res.status(405).end();
}