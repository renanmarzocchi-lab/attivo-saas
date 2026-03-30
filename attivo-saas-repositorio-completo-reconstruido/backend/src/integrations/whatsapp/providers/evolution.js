/**
 * Provider: Evolution API
 * Docs: https://doc.evolution-api.com
 *
 * Envs necessárias:
 *   WHATSAPP_API_URL      = https://sua-evolution.com
 *   WHATSAPP_API_KEY      = <apikey>
 *   WHATSAPP_INSTANCE     = <instance_name>
 */

export async function send({ phone, message }) {
  const apiUrl      = process.env.WHATSAPP_API_URL;
  const apiKey      = process.env.WHATSAPP_API_KEY;
  const instance    = process.env.WHATSAPP_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    throw new Error('Evolution API não configurada (WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_INSTANCE)');
  }

  // Normaliza número: remove caracteres não numéricos, adiciona DDI 55 se ausente
  const normalized = phone.replace(/\D/g, '');
  const number = normalized.startsWith('55') ? normalized : `55${normalized}`;

  const response = await fetch(
    `${apiUrl}/message/sendText/${instance}`,
    {
      method: 'POST',
      headers: {
        'apikey':       apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, text: message }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Evolution API erro ${response.status}: ${body}`);
  }

  const data = await response.json();
  return { externalId: data?.key?.id ?? null };
}
