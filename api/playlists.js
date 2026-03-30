const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Aggiunto per l'autenticazione

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

// Funzione per verificare il token
function getUtenteAutenticato(req) {
    const cookieHeader = req.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    
    if (!tokenMatch) return null;

    try {
        const secret = process.env.JWT_SECRET || 'chiave_segreta_temporanea_da_cambiare_subito';
        return jwt.verify(tokenMatch[1], secret);
    } catch (err) {
        return null;
    }
}

export default async function handler(req, res) {
    // ==========================================
    // GET: Recupera dati (Pubblico o Privato, dipende dall'uso)
    // ==========================================
    if (req.method === 'GET') {
        const { utente_id, playlist_id } = req.query;

        try {
            // CASO A: Se passi playlist_id, restituisce SIA gli Appunti SIA i Podcast
            if (playlist_id) {
                const query = `
                    SELECT 
                        pe.id as collegamento_id,
                        pe.tipo,
                        COALESCE(a.id, p.id) AS id,
                        COALESCE(a.titolo, p.titolo) AS titolo,
                        a.materia,
                        p.categoria,
                        COALESCE(a.cover_url, p.cover_url) AS cover_url,
                        p.audio_url,
                        a.file_url,
                        u.username
                    FROM playlist_elementi pe
                    LEFT JOIN appunti a ON pe.appunto_id = a.id
                    LEFT JOIN podcast p ON pe.podcast_id = p.id
                    LEFT JOIN utenti u ON COALESCE(a.utente_id, p.utente_id)::text = u.id::text
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

    // ==========================================
    // POST: Crea o Aggiunge elementi (Protetto)
    // ==========================================
    if (req.method === 'POST') {
        const utente = getUtenteAutenticato(req);
        if (!utente) {
            return res.status(401).json({ error: "Devi effettuare l'accesso per gestire le playlist." });
        }

        const utente_id_sicuro = utente.utente_id;
        const { titolo, playlist_id, appunto_id, podcast_id, tipo } = req.body;

        // --- CASO 1: Aggiungi un appunto o un podcast alla playlist ---
        if (playlist_id && (appunto_id || podcast_id)) {
            const elementoId = appunto_id || podcast_id;
            const tipoElemento = tipo || 'appunto'; 
            
            try {
                // 1. VERIFICA SICUREZZA: L'utente sta aggiungendo qualcosa a una SUA playlist?
                const checkPlaylistOwner = await pool.query(
                    'SELECT id FROM playlists WHERE id = $1 AND utente_id::text = $2',
                    [playlist_id, utente_id_sicuro.toString()]
                );

                if (checkPlaylistOwner.rows.length === 0) {
                    return res.status(403).json({ error: "Non puoi modificare una playlist di un altro utente." });
                }

                // 2. Controlla se l'elemento è già presente
                const check = await pool.query(
                    'SELECT * FROM playlist_elementi WHERE playlist_id = $1 AND (appunto_id = $2 OR podcast_id = $2) AND tipo = $3',
                    [playlist_id, elementoId, tipoElemento]
                );
                
                if (check.rows.length > 0) return res.status(400).json({ error: "Già presente nella playlist!" });

                // 3. Aggiunge l'elemento
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

        // --- CASO 2: Crea una nuova playlist vuota ---
        if (titolo) {
            try {
                // Usiamo l'ID sicuro preso dal token, ignorando l'utente_id passato nel body
                await pool.query('INSERT INTO playlists (utente_id, titolo) VALUES ($1, $2)', [utente_id_sicuro, titolo]);
                return res.status(201).json({ success: true });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        return res.status(400).json({ error: "Dati mancanti per la creazione/modifica della playlist" });
    }

    return res.status(405).end();
}