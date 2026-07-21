const apiKey = "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";
const aiModel = "meta/llama-3.1-8b-instruct";

const prompt = `Actúas como un consultor experto en FLOSS. 
Evalúa el software Moodle (Puntaje de Riesgo acumulado: 12 puntos, Recomendación: A — Adopción Recomendada).

A continuación se detallan los resultados de la evaluación:
FORTALEZAS (10):
  • Licencia Abierta (PM: 4.5, Dimensión: Legal)
  • Comunidad Activa (PM: 4.2, Dimensión: Comunidad)
OPORTUNIDADES (2):
  • Integración con herramientas actuales (PM: 3.5, Dimensión: Técnica)
DEBILIDADES (1):
  • Curva de aprendizaje (PM: 2.0, Dimensión: Usuario)
AMENAZAS (0):
  • Ninguno

INSTRUCCIÓN CRÍTICA:
Debes generar tu respuesta estrictamente en el siguiente formato, utilizando información 100% real basada EXCLUSIVAMENTE en los resultados listados arriba. No inventes datos.

<RESUMEN>
Genera un resumen ejecutivo breve y directo de entre 90 y 100 palabras. No uses emojis ni viñetas.
</RESUMEN>

<DETALLE>
Genera un análisis y recomendación detallada y profesional (3-4 párrafos) explicando el porqué de la recomendación basándote en las debilidades/amenazas críticas (si las hay) o en las fortalezas clave. Incluye recomendaciones accionables y precisas basadas en los resultados. Usa lenguaje formal, técnico y orientado a directivos de TI. No uses emojis.
</DETALLE>`;

async function test() {
  console.log("Starting fetch with 8b model...");
  const start = Date.now();
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: 'Eres un consultor senior especializado en adopción de software libre (FLOSS) y transformación digital institucional. Tu análisis debe ser riguroso, profesional y orientado a la toma de decisiones ejecutivas.',
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.text();
    console.log(`Data: ${data.substring(0, 200)}...`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
  console.log(`Time taken: ${Date.now() - start}ms`);
}
test();
