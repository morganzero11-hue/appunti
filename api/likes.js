const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: true 
});

export default async function handler(req, res) {
    
    // ==========================================
    // 1. RECUPERA GLI APPUNTI SALVATI (GET)
    // ==========================================
    if (req.method === 'GET') {
        const { utente_id } = req.query;

        if (!utente_id) {
            return res.status(400).json({ error: "Manca l'ID dell'utente" });
        }

        try {
            // Peschiamo tutti gli appunti unendoli alla tabella likes per capire quali ha salvato l'utente
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
            console.error("Errore recupero likes:", err);
            return res.status(500).json({ error: err.message });
        }
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
            // Controlliamo se il like esiste già
            const checkQuery = await pool.query(
                'SELECT id FROM likes WHERE utente_id = $1 AND appunto_id = $2',
                [utente_id, appunto_id]
            );

            if (checkQuery.rows.length > 0) {
                // Se c'è già, l'utente sta cliccando per TOGLIERLO (Unlike)
                await pool.query(
                    'DELETE FROM likes WHERE utente_id = $1 AND appunto_id = $2',
                    [utente_id, appunto_id]
                );
                return res.status(200).json({ success: true, action: 'unliked' });
            } else {
                // Se non c'è, lo AGGIUNGIAMO (Like)
                await pool.query(
                    'INSERT INTO likes (utente_id, appunto_id) VALUES ($1, $2)',
                    [utente_id, appunto_id]
                );
                return res.status(200).json({ success: true, action: 'liked' });
            }
        } catch (err) {
            console.error("Errore salvataggio like:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // Se si usa un metodo non supportato (es. PUT)
    return res.status(405).json({ error: "Metodo non consentito" });
}