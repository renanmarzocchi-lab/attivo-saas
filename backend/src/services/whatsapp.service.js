/**
 * Stub de integração WhatsApp.
 * Estrutura preparada para integrar com Evolution API, Z-API ou Twilio.
 * Por ora: apenas loga a mensagem e simula envio.
 */
export async function sendWhatsAppNotification(notification) {
  const { targetUser, insuranceRecord, message } = notification;

  // TODO: Substituir por chamada real à API WhatsApp
  // Exemplo (Evolution API):
  // await fetch(`${process.env.WHATSAPP_API_URL}/message/sendText/${process.env.WHATSAPP_INSTANCE}`, {
  //   method: 'POST',
  //   headers: { 'apikey': process.env.WHATSAPP_API_KEY, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ number: targetUser.phone, text: message }),
  // });

  console.log(`[WhatsApp STUB] Para: ${targetUser?.name} | Mensagem: ${message}`);
  return { delivered: true };
}

/**
 * Retorna se a integração WhatsApp está configurada
 */
export function isWhatsAppConfigured() {
  return !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_KEY);
}
