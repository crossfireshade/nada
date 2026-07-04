const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const verifyTransporter = async () => {
  if (env.NODE_ENV === 'production' && env.SMTP_USER) {
    try {
      await transporter.verify();
      console.log('SMTP transporter ready');
    } catch (err) {
      console.error('SMTP transporter error:', err.message);
    }
  }
};

verifyTransporter();

module.exports = transporter;
