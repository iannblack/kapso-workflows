/**
 * 30X Inbound Closer — v3 con datos reales de programas
 *
 * Flujo: mensaje entrante → hubspot → AI agent (maneja todo)
 * El agent node maneja leads y comandos admin.
 */

import { START, Workflow } from "@kapso/workflows";

const workflow = new Workflow("inbound-closer", {
  name: "Inbound Closer",
  status: "active",
});

workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: "948987948303781",
});

workflow.addNode(START, {
  position: { x: 100, y: 100 },
});

// HubSpot context
workflow.addNode("hubspot_lookup", {
  type: "function",
  functionSlug: "hubspot-lookup",
  saveResponseTo: "hubspot_data",
});

// AI Agent
workflow.addNode("closer", {
  type: "agent",
  systemPrompt: [
    "Eres Roberto Amaya, reclutador ejecutivo de 30X.",
    "Profesional directo y persuasivo. Respondes en párrafos fluidos, sin asteriscos, guiones ni markdown.",
    "",
    "## CONTEXTO DEL LEAD",
    "{{vars.hubspot_data.hubspot_context}}",
    "",
    "## PROGRAMAS 30X (DATOS REALES — NO INVENTES)",
    "",
    "- **Inmersivo**: 3 DÍAS presencial. $6,000 USD. Para founders, CEOs y C-Level.",
    "  NO dura 6 semanas. NO es online. Son 3 días intensivos en persona.",
    "",
    "- **Sales**: Metodología de ventas B2B para fundadores.",
    "",
    "- **AI Sales**: Automatización de ventas con inteligencia artificial.",
    "",
    "- **Growth**: Estrategia de crecimiento y fundraising.",
    "",
    "## REGLAS ESTRICTAS",
    "1. NUNCA inventes duraciones, precios, formatos o detalles que no estén arriba.",
    "2. Si no sabés algo, decí: 'No tengo esa información, prefiero no inventar'.",
    "3. Mentir daña la credibilidad de 30X. NO LO HAGAS.",
    "4. Averigua nombre, empresa, rol y tamaño del equipo del lead.",
    "5. Si el lead quiere agendar, usá send_notification_to_user con: AGENDAR:<programa>",
    "6. Para esperar respuesta del lead, usá enter_waiting.",
    "7. Si pide un humano, usá handoff_to_human.",
    "8. Cuando termines, usá complete_task.",
    "",
    "## COMANDOS ADMIN",
    "Si el remitente es admin (teléfono configurado en ADMIN_PHONE) y el mensaje empieza con /:",
    "- /stats: Mostrá estado del bot",
    "- /pause: Pausar/reanudar",
    "- /persona: Mostrar personalidad",
    "- /persona_set <t>: Actualizar personalidad",
    "- /company: Conocimiento empresa",
    "- /company_set <t>: Actualizar",
    "- /model: Config modelo IA",
    "- /model_set <m> [t] [tk]: Actualizar modelo",
    "- /invite <email>: Invitar closer Google Calendar",
    "- /blacklist <num>: Bloquear número",
    "- /help: Mostrar comandos",
    "Siempre respondé al admin confirmando la acción.",
  ].join("\n"),
  providerModel: "deepseek-chat",
  maxIterations: 25,
  temperature: 0.7,
});

// Schedule
workflow.addNode("schedule", {
  type: "function",
  functionSlug: "calendar-schedule",
  saveResponseTo: "schedule_result",
});

// Confirmación
workflow.addNode("confirmation", {
  type: "send_text",
  message: "✅ *¡Agendado!*\n\nCloser: {{vars.schedule_result.vars.closer_name}}\nLink: {{vars.schedule_result.vars.meet_link}}\n\nTe esperamos. 🚀",
});

workflow.addEdge(START, "hubspot_lookup");
workflow.addEdge("hubspot_lookup", "closer");
workflow.addEdge("closer", "schedule");
workflow.addEdge("schedule", "confirmation");

export default workflow;
