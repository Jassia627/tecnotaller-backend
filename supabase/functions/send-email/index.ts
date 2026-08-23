// Edge Function de Supabase: envía emails de notificación (RF-16)
// Desplegar con: supabase functions deploy send-email
// Requiere variable secreta: SMTP_URL (ej. Resend/Postmark) o configuración SMTP propia.

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  let payload: EmailPayload;
  try {
    payload = (await req.json()) as EmailPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400 });
  }

  if (!payload.to || !payload.subject) {
    return new Response(JSON.stringify({ error: 'Datos de email incompletos' }), { status: 400 });
  }

  // Integración genérica: se puede conectar a Resend, Postmark o SMTP propio.
  // Ejemplo con un endpoint SMTP-relay configurado como secreto.
  const relayUrl = Deno.env.get('SMTP_RELAY_URL');
  if (!relayUrl) {
    console.log(`[send-email] simulado -> ${payload.to}: ${payload.subject}`);
    return new Response(JSON.stringify({ ok: true, simulated: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'El proveedor de email rechazó el envío' }), {
      status: 502,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
