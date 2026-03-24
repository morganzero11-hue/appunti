const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // GET: Recupera le playlist di un utente
    if (req.method === 'GET') {
        const { utente_id } = req.query;
        if (!utente_id) return res.status(400).json({ error: "Utente ID mancante" });

        try {
            // Prende le playlist e conta quanti appunti ci sono dentro
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

    // POST: Crea una nuova playlist
    if (req.method === 'POST') {
        const { utente_id, titolo } = req.body;
        if (!utente_id || !titolo) return res.status(400).json({ error: "Dati mancanti" });

        try {
            await pool.query('INSERT INTO playlists (utente_id, titolo) VALUES ($1, $2)', [utente_id, titolo]);
            return res.status(201).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}