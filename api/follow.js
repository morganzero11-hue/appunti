const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

export default async function handler(req, res) {
    // GET: Recupera il numero di follower o controlla se lo segui già
    if (req.method === 'GET') {
        const { utente_id, target_id, check_status } = req.query;

        try {
            // Se chiediamo check_status, controlla se utente_id segue target_id
            if (check_status && utente_id && target_id) {
                const check = await pool.query(
                    'SELECT * FROM followers WHERE follower_id = $1 AND seguito_id = $2',
                    [utente_id, target_id]
                );
                return res.status(200).json({ isFollowing: check.rows.length > 0 });
            }

            // Altrimenti restituisce il conteggio (Quanti follower ha? Quanti ne segue?)
            if (utente_id) {
                const followers = await pool.query('SELECT COUNT(*) FROM followers WHERE seguito_id = $1', [utente_id]);
                const following = await pool.query('SELECT COUNT(*) FROM followers WHERE follower_id = $1', [utente_id]);
                return res.status(200).json({
                    followers: parseInt(followers.rows[0].count),
                    following: parseInt(following.rows[0].count)
                });
            }
            
            return res.status(400).json({ error: "Parametri mancanti" });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST: Metti "Segui" o togli "Segui"
    if (req.method === 'POST') {
        const { follower_id, seguito_id } = req.body;
        
        if (!follower_id || !seguito_id) return res.status(400).json({ error: "Dati mancanti" });
        if (follower_id === seguito_id) return res.status(400).json({ error: "Non puoi seguire te stesso" });

        try {
            const check = await pool.query('SELECT * FROM followers WHERE follower_id = $1 AND seguito_id = $2', [follower_id, seguito_id]);
            
            if (check.rows.length > 0) {
                // Se lo segui già -> Togli il segui (Unfollow)
                await pool.query('DELETE FROM followers WHERE follower_id = $1 AND seguito_id = $2', [follower_id, seguito_id]);
                return res.status(200).json({ action: 'unfollowed' });
            } else {
                // Se non lo segui -> Metti il segui (Follow)
                await pool.query('INSERT INTO followers (follower_id, seguito_id) VALUES ($1, $2)', [follower_id, seguito_id]);
                return res.status(201).json({ action: 'followed' });
            }
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).end();
}