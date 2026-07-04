const transporter = require('../config/email');
const env = require('../config/env');

/**
 * Send winners notification email to a publicity manager
 */
const sendWinnersEmail = async (to, winners, guideId) => {
  const winnerRows = winners
    .map(
      (w, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${w.winnerName}</td>
        <td style="padding:8px;border:1px solid #ddd">${w.prize}</td>
        <td style="padding:8px;border:1px solid #ddd">${w.phone || '-'}</td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Liste des Gagnants - Radio Monastir</title>
    </head>
    <body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:20px">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
        <div style="background:#1a237e;color:#fff;padding:20px 30px">
          <h1 style="margin:0;font-size:22px">📻 Radio Monastir</h1>
          <p style="margin:4px 0 0;font-size:14px;opacity:.85">Notification Gagnants</p>
        </div>
        <div style="padding:30px">
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-dessous la liste des gagnants pour le guide <strong>#${guideId}</strong> :</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="background:#e3f2fd">
                <th style="padding:8px;border:1px solid #ddd;text-align:left">#</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Nom</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Prix</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Téléphone</th>
              </tr>
            </thead>
            <tbody>${winnerRows}</tbody>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#888">
            Cet email a été envoyé automatiquement par le système Radio Monastir.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `[Radio Monastir] Liste des Gagnants - Guide #${guideId}`,
    html,
  });
};

/**
 * Send a generic notification email
 */
const sendNotificationEmail = async (to, subject, bodyHtml) => {
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><title>${subject}</title></head>
    <body style="font-family:Arial,sans-serif;color:#333;padding:20px">
      <div style="max-width:600px;margin:auto">
        <div style="background:#1a237e;color:#fff;padding:16px 24px;border-radius:6px 6px 0 0">
          <h2 style="margin:0">📻 Radio Monastir</h2>
        </div>
        <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 6px 6px">
          ${bodyHtml}
          <hr style="margin-top:24px;border:none;border-top:1px solid #eee">
          <p style="font-size:12px;color:#aaa">Système automatique Radio Monastir</p>
        </div>
      </div>
    </body>
    </html>
  `;
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
};

module.exports = { sendWinnersEmail, sendNotificationEmail };
