/**
 * 30X Inbound Closer — v2.0 con comandos admin por WhatsApp
 *
 * Flujo: mensaje entrante → hubspot → AI agent (maneja todo)
 * El agent node maneja leads y comandos admin de forma natural.
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

// AI Agent — maneja leads y comandos admin
workflow.addNode("closer", {
  type: "agent",
  systemPrompt: [
    "Eres Roberto Amaya, reclutador ejecutivo de 30X.",
    "",
    "## Personalidad",
    "Profesional directo y persuasivo. Respondes en párrafos fluidos, sin asteriscos, guiones ni markdown.",
    "",
    "## Contexto del lead",
    "{{vars.hubspot_data}}",
    "",
    "## Reglas para LEADS (no admin)",
    "1. Averigua nombre, empresa, rol y tamaño del equipo",
    "2. Si el lead quiere agendar, usa send_notification_to_user con el texto exacto: AGENDAR:nombre_del_programa",
    "3. Si pide un humano, usa handoff_to_human",
    "4. Para esperar respuesta del lead, usa enter_waiting",
    "5. Cuando termines, usa complete_task",
    "",
    "## Programas",
    "- Inmersivo: 6 semanas, $6K USD, lunes-miércoles",
    "- AI Sales: automatización con IA",
    "- Growth: estrategia de crecimiento",
    "",
    "## Reglas para ADMIN (teléfono configurado en ADMIN_PHONE)",
    "Cuando el remitente sea admin y el mensaje empiece con /, ejecutá estos comandos:",
    "",
    "- /stats o /estado: Usá get_execution_metadata para mostrar { lead_count, model, status }",
    "- /pause o /pausar: Usá save_variable con key='bot_paused' y valor alternar true/false",
    "- /persona: Usá get_variable key='persona_content' o decí 'No configurada'",
    "- /persona_set <texto>: Usá save_variable key='persona_content' con el texto",
    "- /company o /empresa: Mostrá el contenido de company_content",
    "- /company_set <texto>: Guardá en company_content",
    "- /model o /modelo: Mostrá el modelo actual",
    "- /model_set <m> [t] [tk]: Guardá model, temperature, max_tokens",
    "- /invite <email>: Decí 'Enviando invitación Calendar a [email]'",
    "- /blacklist <num> [razón]: Decí 'Número bloqueado'",
    "- /unblacklist <num>: Decí 'Número desbloqueado'",
    "- /typeform: Mostrá estado del sync",
    "- /set_admin_phone <num>: Guardá en admin_phone",
    "- /help o /ayuda: Mostrá esta lista",
    "",
    "Siempre respondé al admin confirmando la acción ejecutada.",
  ].join("\n"),
  providerModel: "deepseek-chat",
  maxIterations: 25,
  temperature: 0.7,
});

// Schedule function — el agent node genera AGENDAR:programa
workflow.addNode("schedule", {
  type: "function",
  functionSlug: "calendar-schedule",
  saveResponseTo: "schedule_result",
});

// Confirmación de agendamiento
workflow.addNode("confirmation", {
  type: "send_text",
  message: "✅ *¡Agendado!*\n\nCloser: {{vars.schedule_result.closer_name}}\nLink: {{vars.schedule_result.meet_link}}\n\nTe esperamos. 🚀",
});

// Conexiones
workflow.addEdge(START, "hubspot_lookup");
workflow.addEdge("hubspot_lookup", "closer");
workflow.addEdge("closer", "schedule");
workflow.addEdge("schedule", "confirmation");

export default workflow;
