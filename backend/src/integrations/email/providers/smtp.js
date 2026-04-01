/**
 * Provider SMTP via Nodemailer.
 *
 * Compatível com: Gmail, Mailtrap, Mailgun SMTP, AWS SES SMTP, Zoho, Postmark SMTP.
 *
 * Envs necessárias:
 *   EMAIL_SMTP_HOST     ex: smtp.mailtrap.io
 *   EMAIL_SMTP_PORT     ex: 587  (padrão)
 *   EMAIL_SMTP_SECURE   ex: false (true para porta 465/SSL)
 *   EMAIL_SMTP_USER     ex: user@mailtrap.io
 *   EMAIL_SMTP_PASS     ex: senha ou App Password
 *   EMAIL_FROM          ex: "Attivo <noreply@attivo.app>"
 *
 * Para Mailtrap (dev/staging):
 *   EMAIL_SMTP_HOST=sandbox.smtp.mailtrap.io
 *   EMAIL_SMTP_PORT=2525
 *   EMAIL_SMTP_USER=<user do inbox>
 *   EMAIL_SMTP_PASS=<pass do inbox>
 */

import nodemailer from 'nodemailer';

let _transport = null;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host:   process.env.EMAIL_SMTP_HOST,
      port:   Number(process.env.EMAIL_SMTP_PORT ?? '587'),
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
      },
      // Timeout para não travar o worker
      connectionTimeout: 10_000,
      greetingTimeout:    5_000,
      socketTimeout:     30_000,
    });
  }
  return _transport;
}

/**
 * @param {{ to, subject, html, text }} opts
 * @returns {{ externalId: string }}
 */
export async function send({ to, subject, html, text }) {
  const info = await getTransport().sendMail({
    from:    process.env.EMAIL_FROM ?? 'noreply@attivo.app',
    to,
    subject,
    html:    html ?? undefined,
    text:    text ?? undefined,
  });

  return { externalId: info.messageId ?? null };
}
