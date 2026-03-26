const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // GET: Recupera dati
    if (req.method === 'GET') {
        const { utente_id, playlist_id } = req.query;

        try {
            // CASO A: Se passi playlist_id, restituisce gli APPUNTI DENTRO quella playlist
            if (playlist_id) {
                const query = `
                    SELECT a.*, u.username, u.nome, u.cognome, u.foto_profilo_url, pe.id as collegamento_id
                    FROM playlist_elementi pe
                    JOIN appunti a ON pe.appunto_id = a.id
                    LEFT JOIN utenti u ON a.utente_id::text = u.id::text
                    WHERE pe.playlist_id = $1
                    ORDER BY pe.id DESC
                `;
                const result = await pool.query(query, [playlist_id]);
                return res.status(200).json(result.rows);
            }

            // CASO B: Se passi utente_id, restituisce L'ELENCO DELLE PLAYLIST dell'utente
            if (utente_id) {
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
            }

            return res.status(400).json({ error: "Manca utente_id o playlist_id" });

        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST: Crea o Aggiunge elementi
    if (req.method === 'POST') {
        // Ho aggiunto podcast_id e tipo qui per comodità
        const { utente_id, titolo, playlist_id, appunto_id, podcast_id, tipo } = req.body;

        // Aggiungi un appunto o un podcast alla playlist (Nuovo blocco)
        if (playlist_id && (appunto_id || podcast_id)) {
            const elementoId = appunto_id || podcast_id;
            const tipoElemento = tipo || 'appunto'; 
            
            try {
                const check = await pool.query(
                    'SELECT * FROM playlist_elementi WHERE playlist_id = $1 AND (appunto_id = $2 OR podcast_id = $2) AND tipo = $3',
                    [playlist_id, elementoId, tipoElemento]
                );
                
                if (check.rows.length > 0) return res.status(400).json({ error: "Già presente nella playlist!" });

                if (tipoElemento === 'podcast') {
                    await pool.query(
                        'INSERT INTO playlist_elementi (playlist_id, podcast_id, tipo) VALUES ($1, $2, $3)',
                        [playlist_id, elementoId, tipoElemento]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO playlist_elementi (playlist_id, appunto_id, tipo) VALUES ($1, $2, $3)',
                        [playlist_id, elementoId, tipoElemento]
                    );
                }
                return res.status(201).json({ success: true });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        // Crea una nuova playlist vuota
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