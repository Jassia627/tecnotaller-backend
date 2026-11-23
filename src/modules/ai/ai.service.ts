import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { planLimitService } from '../../shared/services/plan-limits.service';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface DiagnosticSuggestion {
  probableCauses: string[];
  recommendedTests: string[];
  recommendedParts: Array<{ id?: string; name: string; reason: string }>;
  suggestedObservations: string;
}

export class AiService {
  private async callGemini(parts: GeminiPart[], jsonMode = false, maxOutputTokens = 2048): Promise<string> {
    if (!env.ai.geminiApiKey) {
      throw new BadRequestError(
        'Falta configurar GEMINI_API_KEY en el archivo .env del backend para usar Inteligencia Artificial.',
      );
    }

    const candidateModels = Array.from(
      new Set([
        env.ai.geminiModel,
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
      ]),
    );

    let lastErrorMessage = 'No se pudo obtener respuesta de Google Gemini.';

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.ai.geminiApiKey)}`;
      const isGemini3 = model.startsWith('gemini-3');

      const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens,
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12_000),
        });

        const data = (await response.json()) as GeminiResponse;
        if (!response.ok) {
          lastErrorMessage = data.error?.message || lastErrorMessage;
          const retryable =
            response.status === 429 ||
            response.status === 503 ||
            response.status === 404 ||
            /high demand|no longer available|not found|overloaded/i.test(lastErrorMessage);
          if (retryable) continue;
          throw new BadRequestError(lastErrorMessage);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
        lastErrorMessage = 'Google Gemini no devolvió contenido.';
      } catch (err) {
        if (err instanceof BadRequestError) throw err;
        lastErrorMessage = err instanceof Error ? err.message : lastErrorMessage;
      }
    }

    throw new BadRequestError(lastErrorMessage);
  }

  async inspectReceptionPhotos(
    tenantId: string,
    input: {
      images: Array<{ base64: string; mimeType: string }>;
      deviceBrand?: string;
      deviceModel?: string;
    },
  ): Promise<{ summary: string }> {
    await planLimitService.assertCanUseAi(tenantId);

    if (!input.images || input.images.length === 0) {
      throw new BadRequestError('Debes enviar al menos una imagen para analizar.');
    }

    const deviceLabel = [input.deviceBrand, input.deviceModel].filter(Boolean).join(' ') || 'dispositivo electrónico';

    const prompt = [
      `Eres un técnico receptor experto en un taller de reparación.`,
      `Analiza estas fotos de ingreso de un ${deviceLabel}.`,
      `Redacta en español una descripción breve, objetiva y profesional del estado físico visible al recibir el equipo (pantalla, marco, carcasa trasera, golpes, rayones, grietas, cámaras, puertos o accesorios visibles).`,
      `Devuelve un solo párrafo claro de máximo 4 líneas, sin viñetas ni inventar daños que no se vean.`,
    ].join(' ');

    const parts: GeminiPart[] = [
      { text: prompt },
      ...input.images.slice(0, 4).map((img) => ({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.base64.replace(/^data:[^;]+;base64,/, ''),
        },
      })),
    ];

    const summary = await this.callGemini(parts);
    return { summary };
  }

  async suggestDiagnostic(tenantId: string, workOrderId: string): Promise<DiagnosticSuggestion> {
    await planLimitService.assertCanUseAi(tenantId);

    const [{ data: order, error: orderErr }, { data: partsRows }] = await Promise.all([
      supabase
        .from('work_orders')
        .select('id, device_brand, device_model, problem_description, accessories')
        .eq('id', workOrderId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('parts')
        .select('id, name, sku, stock')
        .eq('tenant_id', tenantId)
        .gt('stock', 0)
        .limit(40),
    ]);

    if (orderErr) throw orderErr;
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    const availablePartsText =
      partsRows && partsRows.length > 0
        ? partsRows.map((p) => `- ${p.id} | ${p.name} (SKU: ${p.sku}, stock: ${p.stock})`).join('\n')
        : 'Sin repuestos con stock registrado.';

    const prompt = `Eres un técnico especialista senior de reparación electrónica.
Analiza esta orden de servicio y responde EXCLUSIVAMENTE en JSON válido con las claves:
{
  "probableCauses": ["causa 1", "causa 2", "causa 3"],
  "recommendedTests": ["prueba 1", "prueba 2", "prueba 3"],
  "recommendedParts": [{"id": "uuid o vacío si no hay en inventario", "name": "nombre repuesto", "reason": "por qué"}],
  "suggestedObservations": "resumen técnico breve en español para registrar en diagnóstico"
}

Equipo: ${order.device_brand} ${order.device_model}
Falla reportada: ${order.problem_description}
Accesorios: ${order.accessories || 'Ninguno'}

Repuestos disponibles en inventario del taller:
${availablePartsText}`;

    const raw = await this.callGemini([{ text: prompt }], true);
    try {
      const parsed = JSON.parse(raw) as DiagnosticSuggestion;
      return {
        probableCauses: Array.isArray(parsed.probableCauses) ? parsed.probableCauses : [],
        recommendedTests: Array.isArray(parsed.recommendedTests) ? parsed.recommendedTests : [],
        recommendedParts: Array.isArray(parsed.recommendedParts) ? parsed.recommendedParts : [],
        suggestedObservations: parsed.suggestedObservations || '',
      };
    } catch {
      return {
        probableCauses: [],
        recommendedTests: [],
        recommendedParts: [],
        suggestedObservations: raw,
      };
    }
  }

  async draftCustomerMessage(
    tenantId: string,
    workOrderId: string,
    customContext?: string,
  ): Promise<{ message: string }> {
    await planLimitService.assertCanUseAi(tenantId);

    const [{ data: order, error: orderErr }, { data: tenant }, { data: diagnostics }] =
      await Promise.all([
        supabase
          .from('work_orders')
          .select('id, guide_number, device_brand, device_model, current_status, problem_description, exit_repairs_performed, customers(full_name)')
          .eq('id', workOrderId)
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        supabase.from('tenants').select('name, slug').eq('id', tenantId).maybeSingle(),
        supabase
          .from('diagnostics')
          .select('observations, faults, recommended_actions')
          .eq('work_order_id', workOrderId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

    if (orderErr) throw orderErr;
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    const latestDiag = diagnostics?.[0];
    const customerRel = order.customers as unknown as { full_name?: string } | null;
    const trackingUrl = `${env.frontendUrl}/t/${tenant?.slug || 'tecnotaller'}/seguimiento?guia=${order.guide_number}`;

    const prompt = `Eres el asesor de atención al cliente del taller "${tenant?.name || 'TecnoTaller'}".
Redacta un mensaje breve, claro, amable y profesional en español para enviar por Telegram al cliente sobre su equipo.
Incluye saludo personalizado si hay nombre, número de guía, estado actual explicado en lenguaje simple, y el enlace de seguimiento al final.
No uses markdown complejo ni inventes precios.

Datos de la orden:
- Cliente: ${customerRel?.full_name || 'Cliente'}
- Guía: ${order.guide_number}
- Equipo: ${order.device_brand} ${order.device_model}
- Estado actual: ${order.current_status}
- Falla inicial: ${order.problem_description}
- Último diagnóstico: ${latestDiag ? `${latestDiag.observations} | Fallas: ${latestDiag.faults} | Acciones: ${latestDiag.recommended_actions}` : 'Sin diagnóstico registrado aún'}
- Reparaciones realizadas: ${order.exit_repairs_performed || 'N/A'}
- Nota adicional del técnico: ${customContext || 'Ninguna'}
- Enlace de seguimiento: ${trackingUrl}`;

    const message = await this.callGemini([{ text: prompt }]);
    return { message };
  }
}

export const aiService = new AiService();
