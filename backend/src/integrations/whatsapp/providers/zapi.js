/**
 * Provider: Z-API
 * Docs: https://developer.z-api.io
 *
 * Envs necessárias:
 *   ZAPI_INSTANCE_ID   = <instance_id>
 *   ZAPI_TOKEN         = <token>
 *   ZAPI_CLIENT_TOKEN  = <client_token>
 */

export async function send({ phone, message }) {
  const instanceId    = process.env.ZAPI_INSTANCE_ID;
  const token         = process.env.ZAPI_TOKEN;
  const clientToken   = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    throw new Error('Z-API não configurada (ZAPI_INSTANCE_ID, ZAPI_TOKEN)');
  }

  const normalized = phone.replace(/\D/g, '');
  const number = normalized.startsWith('55') ? normalized : `55${normalized}`;

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Client-Token':  clientToken ?? '',
      },
      body: JSON.stringify({ phone: number, message }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Z-API erro ${response.status}: ${body}`);
  }

  const data = await response.json();
  return { externalId: data?.zaapId ?? null };
}
