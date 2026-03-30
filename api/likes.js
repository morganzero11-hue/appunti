const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Aggiunta la libreria per l'autenticazione sicura

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: true 
});

// Funzione di supporto per leggere il Token in modo sicuro
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
    // 1. RICHIESTE GET (Lettura - Pubblico)
    // ==========================================
    if (req.method === 'GET') {
        
        // 🏆 CASO A: Classifica Top Appunti (Home Page)
        if (req.query.top) {
            try {
                const limit = parseInt(req.query.top) || 6;
                const query = `
                    SELECT 
                        a.*, 
                        u.username, u.nome, u.cognome, u.foto_profilo_url,
                        COUNT(l.id) AS likes_count
                    FROM appunti a
                    LEFT JOIN utenti u ON a.utente_id::text = u.id::text
                    -- Aggiunto "AND l.tipo = 'appunto'" per non contare i like dei podcast per sbaglio!
                    LEFT JOIN likes l ON a.id = l.appunto_id AND l.tipo = 'appunto' 
                    GROUP BY a.id, u.username, u.nome, u.cognome, u.foto_profilo_url
                    ORDER BY likes_count DESC, a.data_caricamento DESC
                    LIMIT $1
                `;
                const result = await pool.query(query, [limit]);
                return res.status(200).json(result.rows);
            } catch (err) {
                console.error("Errore classifica:", err);
                return res.status(500).json({ error: err.message });
            }
        }

        // 📊 CASO B: Contare i like RICEVUTI da un utente (Profilo Statistiche)
        if (req.query.autore_id) {
            try {
                const query = `
                    SELECT COUNT(l.id) as total_likes 
                    FROM likes l 
                    LEFT JOIN appunti a ON l.appunto_id = a.id AND l.tipo = 'appunto'
                    LEFT JOIN podcast p ON l.appunto_id = p.id AND l.tipo = 'podcast'
                    WHERE a.utente_id = $1 OR p.utente_id = $1
                `;
                const result = await pool.query(query, [req.query.autore_id]);
                return res.status(200).json({ total: parseInt(result.rows[0].total_likes) || 0 });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        // ❤️ CASO C: Recuperare la lista dei SALVATI (Profilo -> Tab Salvati)
        const { utente_id } = req.query;
        if (utente_id) {
            try {
                // Prende gli appunti
                const queryAppunti = `
                    SELECT a.*, u.username, u.nome, u.cognome, u.foto_profilo_url 
                    FROM appunti a
                    JOIN likes l ON a.id = l.appunto_id
                    LEFT JOIN utenti u ON a.utente_id::text = u.id::text
                    WHERE l.utente_id = $1 AND l.tipo = 'appunto'
                    ORDER BY l.id DESC
                `;
                const appuntiRes = await pool.query(queryAppunti, [utente_id]);

                // Prende i podcast
                const queryPodcast = `
                    SELECT p.*, u.username 
                    FROM podcast p
                    JOIN likes l ON p.id = l.appunto_id
                    LEFT JOIN utenti u ON p.utente_id::text = u.id::text
                    WHERE l.utente_id = $1 AND l.tipo = 'podcast'
                    ORDER BY l.id DESC
                `;
                const podcastRes = await pool.query(queryPodcast, [utente_id]);

                return res.status(200).json({
                    appunti: appuntiRes.rows,
                    podcast: podcastRes.rows
                });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        return res.status(400).json({ error: "Parametri mancanti" });
    }

    // ==========================================
    // 2. METTI O TOGLI IL MI PIACE (POST - Protetto)
    // ==========================================
    if (req.method === 'POST') {
        // 1. Verifichiamo chi sta facendo la richiesta in modo sicuro
        const utente = getUtenteAutenticato(req);
        if (!utente) {
            return res.status(401).json({ error: "Devi effettuare l'accesso per aggiungere ai salvati." });
        }

        // 2. Ignoriamo l'utente_id passato nel body e usiamo quello del Token crittografato
        const utente_id_sicuro = utente.utente_id;
        
        // Accetta sia 'appunto_id' (vecchio frontend) che 'elemento_id' (nuovo frontend podcast)
        const targetId = req.body.appunto_id || req.body.elemento_id;
        const tipo = req.body.tipo || 'appunto';

        if (!targetId) {
            return res.status(400).json({ error: "Manca l'ID dell'elemento" });
        }

        try {
            const checkQuery = await pool.query(
                'SELECT id FROM likes WHERE utente_id = $1 AND appunto_id = $2 AND tipo = $3',
                [utente_id_sicuro, targetId, tipo]
            );

            if (checkQuery.rows.length > 0) {
                // Se esiste già, lo RIMUOVE (Cuore vuoto)
                await pool.query('DELETE FROM likes WHERE id = $1', [checkQuery.rows[0].id]);
                return res.status(200).json({ success: true, action: 'unliked' });
            } else {
                // Se non esiste, lo AGGIUNGE (Cuore pieno)
                await pool.query('INSERT INTO likes (utente_id, appunto_id, tipo) VALUES ($1, $2, $3)', [utente_id_sicuro, targetId, tipo]);
                return res.status(200).json({ success: true, action: 'liked' });
            }
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Metodo non consentito" });
}