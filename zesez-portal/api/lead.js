// api/lead.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, phone, service, customNote } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Ad və telefon nömrəsi mütləqdir.' });
  }

  // Log lead (In production, forward to Telegram Bot API, Google Sheets or Make.com Webhook)
  console.log('Yeni Müraciət Daxil Oldu:', { name, phone, service, customNote, date: new Date().toISOString() });

  // Optional Telegram Notification hook if env var is configured
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const msg = `⚡ *Yeni Zesez Müraciəti!*\n👤 Ad: ${name}\n📞 Tel: ${phone}\n📦 Paket: ${service}\n📝 Qeyd: ${customNote || 'Yoxdur'}`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: msg,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {
      console.error('Telegram bildiriş xətası:', e);
    }
  }

  return res.status(200).json({ success: true, message: 'Müraciətiniz uğurla qeydə alındı.' });
};
