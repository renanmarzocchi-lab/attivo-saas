/**
 * Provider: Twilio (WhatsApp via Sandbox ou número aprovado)
 * Docs: https://www.twilio.com/docs/whatsapp
 *
 * Envs necessárias:
 *   TWILIO_ACCOUNT_SID = <account_sid>
 *   TWILIO_AUTH_TOKEN  = <auth_token>
 *   TWILIO_FROM        = whatsapp:+14155238886
 */

export async function send({ phone, message }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio não configurado (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)');
  }

  const normalized = phone.replace(/\D/g, '');
  const to = `whatsapp:+${normalized.startsWith('55') ? normalized : `55${normalized}`}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const body = new URLSearchParams({ From: from, To: to, Body: message });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Twilio erro ${response.status}: ${data.message ?? ''}`);
  }

  const data = await response.json();
  return { externalId: data.sid ?? null };
}
