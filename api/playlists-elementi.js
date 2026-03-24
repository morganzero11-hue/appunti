const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { playlist_id, appunto_id } = req.body;
        if (!playlist_id || !appunto_id) return res.status(400).json({ error: "Dati mancanti" });

        try {
            const check = await pool.query('SELECT * FROM playlist_elementi WHERE playlist_id = $1 AND appunto_id = $2', [playlist_id, appunto_id]);
            if (check.rows.length > 0) {
                return res.status(400).json({ error: "Questo appunto è già nella playlist!" });
            }

            await pool.query('INSERT INTO playlist_elementi (playlist_id, appunto_id) VALUES ($1, $2)', [playlist_id, appunto_id]);
            return res.status(201).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}