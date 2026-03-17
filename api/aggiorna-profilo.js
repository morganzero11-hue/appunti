const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { id, foto_profilo_url } = req.body;
    
    if (!id || !foto_profilo_url) {
        return res.status(400).json({ error: "Dati mancanti" });
    }

    try {
        await pool.query(
            'UPDATE utenti SET foto_profilo_url = $1 WHERE id = $2',
            [foto_profilo_url, id]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}