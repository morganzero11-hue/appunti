const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

export default async function handler(req, res) {
    // 1. GESTIONE POST: Salva un nuovo appunto nel database
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
        
    // 2. GESTIONE GET: Recupera gli appunti dal database
    } else if (req.method === 'GET') {
        const { utente_id } = req.query;
        try {
            let result;
            if (utente_id) {
                result = await pool.query(
                    'SELECT * FROM appunti WHERE utente_id = $1 ORDER BY data_caricamento DESC',
                    [utente_id]
                );
            } else {
                result = await pool.query(
                    'SELECT * FROM appunti ORDER BY data_caricamento DESC'
                );
            }
            return res.status(200).json(result.rows);
        } catch (err) {
            console.error("Errore recupero:", err);
            return res.status(500).json({ error: err.message });
        }
        
    // 3. GESTIONE DELETE: Elimina un appunto dal database
    } else if (req.method === 'DELETE') {
        const { id } = req.query; // Recuperiamo l'ID dell'appunto da eliminare
        
        if (!id) {
            return res.status(400).json({ error: "ID appunto mancante" });
        }

        try {
            // Eseguiamo la query di cancellazione
            await pool.query('DELETE FROM appunti WHERE id = $1', [id]);
            return res.status(200).json({ success: true, message: "Appunto eliminato" });
        } catch (err) {
            console.error("Errore cancellazione:", err);
            return res.status(500).json({ error: err.message });
        }
        
    } else {
        return res.status(405).json({ error: "Metodo non consentito" });
    }
}