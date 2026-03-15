module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Solo POST ammesso' });
  }

  // Cancella i cookie di sessione impostando la scadenza nel passato
  res.setHeader('Set-Cookie', [
    'utente_id=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);

  return res.status(200).json({ success: true });
};