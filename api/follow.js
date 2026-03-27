const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // ─── GET: RECUPERA CONTEGGI, STATO o ELENCO AMICI ───
    if (req.method === 'GET') {
        const { utente_id, target_id, check_status, elenco_seguiti } = req.query;

        try {
            // Caso 1: Recupera l'elenco dettagliato degli utenti seguiti (AMICI)
            if (elenco_seguiti && utente_id) {
                // AGGIUNTO ::text per prevenire errori di Data Type Mismatch nella JOIN
                const result = await pool.query(
                    `SELECT u.id, u.username, u.foto_profilo_url, u.scuola 
                     FROM followers f
                     JOIN utenti u ON f.seguito_id::text = u.id::text
                     WHERE f.follower_id::text = $1
                     ORDER BY f.data_creazione DESC`,
                    [utente_id.toString()]
                );
                return res.status(200).json(result.rows);
            }

            // Caso 2: Controlla se utente_id segue target_id (per il tasto Segui/Smetti)
            if (check_status && utente_id && target_id) {
                const check = await pool.query(
                    'SELECT * FROM followers WHERE follower_id::text = $1 AND seguito_id::text = $2',
                    [utente_id.toString(), target_id.toString()]
                );
                return res.status(200).json({ isFollowing: check.rows.length > 0 });
            }

            // Caso 3: Restituisce solo i conteggi numerici
            if (utente_id) {
                const followers = await pool.query('SELECT COUNT(*) FROM followers WHERE seguito_id::text = $1', [utente_id.toString()]);
                const following = await pool.query('SELECT COUNT(*) FROM followers WHERE follower_id::text = $1', [utente_id.toString()]);
                return res.status(200).json({
                    followers: parseInt(followers.rows[0].count),
                    following: parseInt(following.rows[0].count)
                });
            }
            
            return res.status(400).json({ error: "Parametri mancanti" });
        } catch (err) {
            console.error("Errore API GET Follow:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // ─── POST: METTI O TOGLI IL "SEGUI" ───
    if (req.method === 'POST') {
        const { follower_id, seguito_id } = req.body;
        
        if (!follower_id || !seguito_id) return res.status(400).json({ error: "Dati mancanti" });
        if (follower_id.toString() === seguito_id.toString()) return res.status(400).json({ error: "Non puoi seguire te stesso" });

        try {
            const check = await pool.query(
                'SELECT * FROM followers WHERE follower_id::text = $1 AND seguito_id::text = $2', 
                [follower_id.toString(), seguito_id.toString()]
            );
            
            if (check.rows.length > 0) {
                // Se lo segui già -> Unfollow
                await pool.query(
                    'DELETE FROM followers WHERE follower_id::text = $1 AND seguito_id::text = $2', 
                    [follower_id.toString(), seguito_id.toString()]
                );
                return res.status(200).json({ action: 'unfollowed' });
            } else {
                // Se non lo segui -> Follow
                await pool.query(
                    'INSERT INTO followers (follower_id, seguito_id) VALUES ($1, $2)', 
                    [follower_id, seguito_id]
                );
                return res.status(201).json({ action: 'followed' });
            }
        } catch (err) {
            console.error("Errore API POST Follow:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}