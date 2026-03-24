const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // GET: Recupera tutti i podcast
    if (req.method === 'GET') {
        const { utente_id } = req.query;
        try {
            // Nota che p.* prenderà in automatico anche le nuove colonne 'scuola' e 'fonti'
            let query = `
                SELECT p.*, u.username, u.foto_profilo_url 
                FROM podcast p 
                LEFT JOIN utenti u ON p.utente_id::text = u.id::text
            `;
            let params = [];

            if (utente_id) {
                query += ` WHERE p.utente_id = $1 ORDER BY p.data_caricamento DESC`;
                params = [utente_id];
            } else {
                query += ` ORDER BY p.data_caricamento DESC`;
            }

            const result = await pool.query(query, params);
            return res.status(200).json(result.rows);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST: Carica un nuovo podcast
    if (req.method === 'POST') {
        const { utente_id, titolo, descrizione, categoria, scuola, fonti, audio_url, cover_url } = req.body;
        
        if (!utente_id || !titolo || !audio_url) {
            return res.status(400).json({ error: "Dati mancanti" });
        }

        try {
            // AGGIORNATO l'INSERT per includere le nuove colonne
            await pool.query(
                'INSERT INTO podcast (utente_id, titolo, descrizione, categoria, scuola, fonti, audio_url, cover_url, data_caricamento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
                [
                    utente_id, 
                    titolo, 
                    descrizione || null, 
                    categoria || 'Generale', 
                    scuola || null,   // Salva la scuola
                    fonti || null,    // Salva le fonti
                    audio_url, 
                    cover_url || null
                ]
            );
            return res.status(201).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // DELETE: Elimina un podcast
    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "ID mancante" });

        try {
            await pool.query('DELETE FROM podcast WHERE id = $1', [id]);
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}