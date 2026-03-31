const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Aggiunta la libreria per leggere il token sicuro

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

// Funzione di supporto per verificare se l'utente è loggato in modo sicuro
function getUtenteAutenticato(req) {
    const cookieHeader = req.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    
    if (!tokenMatch) return null;

    try {
        const secret = process.env.JWT_SECRET || 'chiave_segreta_temporanea_da_cambiare_subito';
        return jwt.verify(tokenMatch[1], secret); // Restituisce i dati crittografati nel token (es. utente_id)
    } catch (err) {
        return null; // Token non valido o scaduto
    }
}

export default async function handler(req, res) {
    // ==========================================
    // GET: Recupera tutti i podcast (Pubblico)
    // ==========================================
    if (req.method === 'GET') {
        const { utente_id } = req.query;
        try {
            // "p.*" estrarrà automaticamente anche la colonna "livello"
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

    // ==========================================
    // POST: Carica un nuovo podcast (Protetto)
    // ==========================================
    if (req.method === 'POST') {
        // 1. Verifichiamo chi sta facendo la richiesta
        const utente = getUtenteAutenticato(req);
        if (!utente) {
            return res.status(401).json({ error: "Devi effettuare l'accesso per caricare un podcast." });
        }

        // 2. Estraiamo i dati (aggiunto "livello")
        const { titolo, descrizione, categoria, livello, scuola, fonti, audio_url, cover_url } = req.body;
        const utente_id_sicuro = utente.utente_id; 
        
        if (!titolo || !audio_url) {
            return res.status(400).json({ error: "Dati mancanti (titolo e audio_url sono obbligatori)" });
        }

        try {
            // 3. Inseriamo "livello" nella query SQL
            await pool.query(
                'INSERT INTO podcast (utente_id, titolo, descrizione, categoria, livello, scuola, fonti, audio_url, cover_url, data_caricamento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())',
                [
                    utente_id_sicuro, 
                    titolo, 
                    descrizione || null, 
                    categoria || 'Generale', 
                    livello || null, // Aggiunto il livello qui
                    scuola || null,  
                    fonti || null,    
                    audio_url, 
                    cover_url || null
                ]
            );
            return res.status(201).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ==========================================
    // DELETE: Elimina un podcast (Protetto)
    // ==========================================
    if (req.method === 'DELETE') {
        // 1. Verifichiamo chi sta facendo la richiesta
        const utente = getUtenteAutenticato(req);
        if (!utente) {
            return res.status(401).json({ error: "Non autorizzato." });
        }

        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "ID mancante" });

        try {
            // 2. Controlliamo che il podcast esista e APPARTENGA a questo utente
            const checkOwnership = await pool.query(
                'SELECT id FROM podcast WHERE id = $1 AND utente_id::text = $2', 
                [id, utente.utente_id.toString()]
            );

            if (checkOwnership.rows.length === 0) {
                // Se non c'è corrispondenza, o il podcast non esiste o l'utente sta provando a cancellare quello di un altro
                return res.status(403).json({ error: "Azione negata: non puoi eliminare il podcast di un altro utente." });
            }

            // 3. Se supera il controllo, possiamo procedere all'eliminazione sicura
            await pool.query('DELETE FROM podcast WHERE id = $1', [id]);
            return res.status(200).json({ success: true });

        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}