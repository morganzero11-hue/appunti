// Importiamo il Pool da 'pg'
const { Pool } = require('pg');

// Configuriamo il Pool fuori dall'handler per riutilizzare la connessione (più veloce)
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Indispensabile per connessioni sicure su Neotech/Render
  }
});

// Questa è la funzione che Vercel esegue quando visiti /api/test-db
module.exports = async (req, res) => {
  // Gestione dei rami: accetta solo richieste GET (opzionale ma consigliato)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    // 1. Prendi un client dal pool
    const client = await pool.connect();
    
    // 2. Esegui la query di test
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    // 3. Rilascia il client subito dopo la query
    client.release();

    // 4. Invia la risposta al frontend (HTML/JS)
    res.status(200).json({
      success: true,
      message: "Connessione a PostgreSQL (Neotech) riuscita!",
      data: {
        serverTime: result.rows[0].current_time,
        version: result.rows[0].pg_version
      }
    });

  } catch (err) {
    // Gestione errori: invia i dettagli se la connessione fallisce
    console.error("Errore DB:", err);
    res.status(500).json({ 
      success: false, 
      error: "Errore di connessione al database",
      details: err.message 
    });
  }
};