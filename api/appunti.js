const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Solo GET ammesso' });
  }

  const { username, limit } = req.query;

  try {
    let result;

    if (username) {
      // Appunti di un utente specifico
      result = await pool.query(
        `SELECT
           a.id,
           a.titolo,
           a.materia,
           a.file_url,
           a.data_caricamento,
           u.username,
           u.nome,
           u.cognome
         FROM appunti a
         JOIN utenti u ON u.id = a.utente_id
         WHERE u.username = $1
         ORDER BY a.data_caricamento DESC`,
        [username.toLowerCase()]
      );
    } else {
      // Ultimi appunti per la home
      const lim = parseInt(limit) || 6;
      result = await pool.query(
        `SELECT
           a.id,
           a.titolo,
           a.materia,
           a.file_url,
           a.data_caricamento,
           u.username,
           u.nome,
           u.cognome
         FROM appunti a
         JOIN utenti u ON u.id = a.utente_id
         ORDER BY a.data_caricamento DESC
         LIMIT $1`,
        [lim]
      );
    }

    const rows = result.rows.map(r => ({
      ...r,
      autore: `${r.nome} ${r.cognome}`,
      data: r.data_caricamento
        ? new Date(r.data_caricamento).toLocaleDateString('it-IT', {
            day: 'numeric', month: 'short', year: 'numeric'
          })
        : ''
    }));

    return res.status(200).json(rows);

  } catch (err) {
    console.error('Errore appunti:', err);
    return res.status(500).json({ message: 'Errore server', error: err.message });
  }
};