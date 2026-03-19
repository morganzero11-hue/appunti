const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: true 
});

export default async function handler(req, res) {
    
    // ==========================================
    // 1. RICHIESTE GET (Lettura)
    // ==========================================
    if (req.method === 'GET') {
        
        // 🏆 CASO A: Classifica Top Appunti (Home Page)
        if (req.query.top) {
            try {
                const limit = parseInt(req.query.top) || 6;
                // Query che raggruppa gli appunti, conta i like, e ordina per numero di like (e in caso di parità per data più recente)
                const query = `
                    SELECT 
                        a.*, 
                        u.username, u.nome, u.cognome, u.foto_profilo_url,
                        COUNT(l.id) AS likes_count
                    FROM appunti a
                    LEFT JOIN utenti u ON a.utente_id::text = u.id::text
                    LEFT JOIN likes l ON a.id = l.appunto_id
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

        // 📊 CASO B: Contare i like RICEVUTI dagli appunti di un utente (Profilo)
        if (req.query.autore_id) {
            try {
                const query = `
                    SELECT COUNT(l.id) as total_likes 
                    FROM likes l 
                    JOIN appunti a ON l.appunto_id = a.id 
                    WHERE a.utente_id = $1
                `;
                const result = await pool.query(query, [req.query.autore_id]);
                return res.status(200).json({ total: parseInt(result.rows[0].total_likes) || 0 });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        // ❤️ CASO C: Recuperare la lista degli appunti SALVATI dall'utente (Tab Salvati)
        const { utente_id } = req.query;
        if (utente_id) {
            try {
                const query = `
                    SELECT a.*, u.username, u.nome, u.cognome, u.foto_profilo_url 
                    FROM appunti a
                    JOIN likes l ON a.id = l.appunto_id
                    LEFT JOIN utenti u ON a.utente_id::text = u.id::text
                    WHERE l.utente_id = $1
                    ORDER BY l.created_at DESC
                `;
                const result = await pool.query(query, [utente_id]);
                return res.status(200).json(result.rows);
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        return res.status(400).json({ error: "Parametri mancanti" });
    }

    // ==========================================
    // 2. METTI O TOGLI IL MI PIACE (POST)
    // ==========================================
    if (req.method === 'POST') {
        const { utente_id, appunto_id } = req.body;

        if (!utente_id || !appunto_id) {
            return res.status(400).json({ error: "Mancano utente_id o appunto_id" });
        }

        try {
            const checkQuery = await pool.query(
                'SELECT id FROM likes WHERE utente_id = $1 AND appunto_id = $2',
                [utente_id, appunto_id]
            );

            if (checkQuery.rows.length > 0) {
                // Rimuove il Like
                await pool.query('DELETE FROM likes WHERE utente_id = $1 AND appunto_id = $2', [utente_id, appunto_id]);
                return res.status(200).json({ success: true, action: 'unliked' });
            } else {
                // Aggiunge il Like
                await pool.query('INSERT INTO likes (utente_id, appunto_id) VALUES ($1, $2)', [utente_id, appunto_id]);
                return res.status(200).json({ success: true, action: 'liked' });
            }
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Metodo non consentito" });
}