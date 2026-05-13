/**
 * 30X Inbound Closer — Kapso Workflow
 *
 * Manages inbound WhatsApp conversations:
 * 1. Receives inbound message trigger
 * 2. AI agent handles conversation (closer flow)
 * 3. Intercepts admin commands (phone-based admin)
 * 4. Routes to scheduling when lead wants to book
 * 5. Syncs leads to HubSpot
 *
 * Requires:
 * - A connected AI model (DeepSeek / Claude)
 * - HubSpot integration for lead context
 * - Google Calendar integration for scheduling
 */

import { START, Workflow } from "@kapso/workflows";

const workflow = new Workflow("inbound-closer", {
  name: "Inbound Closer",
  status: "active",
});

// ── Trigger: inbound WhatsApp message ────────────────────────────────────
workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: "948987948303781", // Número principal 30X
});

// ── Agent node: the AI closer ────────────────────────────────────────────
workflow.addNode("closer_agent", {
  type: "agent",
  systemPrompt: [
    "Eres Roberto Amaya, reclutador ejecutivo de 30X.",
    "",
    "## Tu personalidad",
    "- Profesional directo y persuasivo",
    "- No usas asteriscos, guiones, ni markdown",
    "- Respondes en párrafos fluidos y naturales",
    "",
    "## Tu objetivo",
    "Calificar leads y agendar llamadas de descubrimiento.",
    "",
    "## Contexto del prospecto",
    "{{context.hubspot_context}}",
    "",
    "## Reglas",
    "1. Siempre averigua nombre, empresa, rol, y tamaño del equipo",
    "2. Si el lead muestra interés en agendar, genera: [[AGENDAR:inmersivo|YYYY-MM-DDTHH:MM:SS]]",
    "3. Si el lead pide un humano, usa la herramienta handoff_to_human",
    "4. Si es una consulta técnica, responde con info de los programas:",
    "   - Inmersivo: 6 semanas, $6K USD, lunes-miércoles",
    "   - AI Sales: automatización con IA",
    "   - Growth: estrategia de crecimiento",
    "5. No inventes información que no sepas",
    "",
    "## Extracción de datos del lead",
    "Cada vez que aprendas info nueva del prospecto, guarda los datos usando la herramienta save_variable con clave 'lead_{phone}' y valor JSON.",
    "Incluye: name, company, role, employees_range, revenue_range, can_invest, is_decision_maker, program_interest",
  ].join("\n"),
  providerModelId: "deepseek-chat", // Se resuelve con list-provider-models.js
  maxIterations: 15,
  temperature: 0.7,
});

// ── Admin command handler ────────────────────────────────────────────────
workflow.addNode("admin_or_closer", {
  type: "decide",
  decisionType: "function",
  functionSlug: "check-is-admin",
  conditions: [
    { label: "admin_command", description: "Message is an admin command (starts with /)" },
    { label: "normal_message", description: "Regular lead message" },
  ],
});

// ── Admin router ─────────────────────────────────────────────────────────
workflow.addNode("admin_router", {
  type: "decide",
  decisionType: "function",
  functionSlug: "route-admin-command",
  conditions: [
    { label: "pause", description: "/pause or /pausar" },
    { label: "stats", description: "/stats or /estado" },
    { label: "leads", description: "/leads command" },
    { label: "persona", description: "/persona or /personalidad" },
    { label: "persona_set", description: "/persona_set <text>" },
    { label: "company", description: "/company or /empresa" },
    { label: "company_set", description: "/company_set <text>" },
    { label: "model", description: "/model or /modelo" },
    { label: "model_set", description: "/model_set <model> [temp] [tokens]" },
    { label: "stage", description: "/stage or /stages or /etapas" },
    { label: "stage_set", description: "/stage_set <key> <text>" },
    { label: "behavior", description: "/behavior or /comportamiento" },
    { label: "invite", description: "/invite <email> [name]" },
    { label: "blacklist", description: "/blacklist or /bloquear" },
    { label: "unblacklist", description: "/unblacklist or /desbloquear" },
    { label: "typeform", description: "/typeform or /tf" },
    { label: "typeform_sync", description: "/typeform_sync or /tfsync" },
    { label: "typeform_send", description: "/typeform_send or /tfsend" },
    { label: "set_admin", description: "/set_admin_phone or /admin" },
    { label: "help", description: "/help or /ayuda" },
    { label: "unknown", description: "Unrecognized command" },
  ],
});

// ── Admin response nodes ────────────────────────────────────────────────
workflow.addNode("admin_help", {
  type: "send_text",
  message: [
    "📋 *Comandos disponibles*",
    "",
    "/stats — Resumen del bot",
    "/pause — Pausar/reanudar bot",
    "/leads — Últimos 10 leads",
    "/persona — Ver personalidad",
    "/persona_set <texto> — Actualizar personalidad",
    "/company — Ver conocimiento empresa",
    "/company_set <texto> — Actualizar",
    "/model — Config modelo IA",
    "/model_set <modelo> [temp] [tokens]",
    "/stage <key> — Ver playbook por etapa",
    "/stage_set <key> <text> — Actualizar",
    "/behavior — Config comportamiento",
    "/invite <email> — Invitar closer Google Calendar",
    "/blacklist <num> [razón] — Bloquear",
    "/unblacklist <num> — Desbloquear",
    "/typeform — Estado Typeform",
    "/typeform_sync — Sync Typeform ahora",
    "/typeform_send — Enviar mensajes pendientes",
    "/set_admin_phone <num> — Configurar admin",
    "/help — Esto",
  ].join("\n"),
});

workflow.addNode("admin_stats", {
  type: "send_text",
  message: "📊 Consultando estadísticas...",
});

workflow.addNode("admin_pause", {
  type: "send_text",
  message: "⏸️ Alternando pausa global...",
});

workflow.addNode("admin_persona", {
  type: "send_text",
  message: "🧠 Consultando personalidad...",
});

workflow.addNode("admin_persona_set", {
  type: "send_text",
  message: "✅ Actualizando personalidad...",
});

workflow.addNode("admin_company", {
  type: "send_text",
  message: "🏢 Consultando conocimiento de empresa...",
});

workflow.addNode("admin_company_set", {
  type: "send_text",
  message: "✅ Actualizando conocimiento de empresa...",
});

workflow.addNode("admin_model", {
  type: "send_text",
  message: "🤖 Consultando configuración del modelo...",
});

workflow.addNode("admin_model_set", {
  type: "send_text",
  message: "✅ Actualizando modelo...",
});

workflow.addNode("admin_stages", {
  type: "send_text",
  message: "📋 Consultando etapas...",
});

workflow.addNode("admin_stage_set", {
  type: "send_text",
  message: "✅ Actualizando playbook de etapa...",
});

workflow.addNode("admin_behavior", {
  type: "send_text",
  message: "⚙️ Consultando comportamiento...",
});

workflow.addNode("admin_invite", {
  type: "send_text",
  message: "📧 Enviando invitación Google Calendar...",
});

workflow.addNode("admin_blacklist", {
  type: "send_text",
  message: "⛔ Bloqueando número...",
});

workflow.addNode("admin_unblacklist", {
  type: "send_text",
  message: "✅ Desbloqueando número...",
});

workflow.addNode("admin_typeform", {
  type: "send_text",
  message: "📋 Consultando estado de Typeform...",
});

workflow.addNode("admin_typeform_sync", {
  type: "send_text",
  message: "🔄 Ejecutando sync de Typeform...",
});

workflow.addNode("admin_typeform_send", {
  type: "send_text",
  message: "📤 Enviando mensajes Typeform pendientes...",
});

workflow.addNode("admin_set_phone", {
  type: "send_text",
  message: "📱 Configurando número admin...",
});

workflow.addNode("admin_unknown", {
  type: "send_text",
  message: "❓ Comando no reconocido. Usá /help para ver los comandos disponibles.",
});

// ── Send closing message after admin commands ────────────────────────────
workflow.addNode("admin_done", {
  type: "send_text",
  message: "✅ Comando ejecutado. ¿Algo más?",
});

// ── Scheduling flow ──────────────────────────────────────────────────────
workflow.addNode("schedule_check", {
  type: "decide",
  decisionType: "ai",
  providerModelId: "deepseek-chat",
  conditions: [
    { label: "schedule", description: "Lead wants to schedule a call" },
    { label: "continue", description: "Continue normal conversation" },
  ],
});

workflow.addNode("schedule_call", {
  type: "function",
  functionSlug: "calendar-schedule",
});

workflow.addNode("schedule_success", {
  type: "send_text",
  message: "✅ ¡Agendado! Te enviaremos el link de Google Meet pronto. 📅",
});

// ── Edges: flow connections ──────────────────────────────────────────────
workflow.addEdge(START, "admin_or_closer");

// Admin flows
workflow.addEdge("admin_or_closer", "admin_router", { label: "admin_command" });
workflow.addEdge("admin_or_closer", "closer_agent", { label: "normal_message" });

workflow.addEdge("admin_router", "admin_help", { label: "help" });
workflow.addEdge("admin_router", "admin_stats", { label: "stats" });
workflow.addEdge("admin_router", "admin_pause", { label: "pause" });
workflow.addEdge("admin_router", "admin_leads", { label: "leads" });
workflow.addEdge("admin_router", "admin_persona", { label: "persona" });
workflow.addEdge("admin_router", "admin_persona_set", { label: "persona_set" });
workflow.addEdge("admin_router", "admin_company", { label: "company" });
workflow.addEdge("admin_router", "admin_company_set", { label: "company_set" });
workflow.addEdge("admin_router", "admin_model", { label: "model" });
workflow.addEdge("admin_router", "admin_model_set", { label: "model_set" });
workflow.addEdge("admin_router", "admin_stages", { label: "stage" });
workflow.addEdge("admin_router", "admin_stage_set", { label: "stage_set" });
workflow.addEdge("admin_router", "admin_behavior", { label: "behavior" });
workflow.addEdge("admin_router", "admin_invite", { label: "invite" });
workflow.addEdge("admin_router", "admin_blacklist", { label: "blacklist" });
workflow.addEdge("admin_router", "admin_unblacklist", { label: "unblacklist" });
workflow.addEdge("admin_router", "admin_typeform", { label: "typeform" });
workflow.addEdge("admin_router", "admin_typeform_sync", { label: "typeform_sync" });
workflow.addEdge("admin_router", "admin_typeform_send", { label: "typeform_send" });
workflow.addEdge("admin_router", "admin_set_phone", { label: "set_admin" });
workflow.addEdge("admin_router", "admin_unknown", { label: "unknown" });

// All admin commands end with done
const adminCommands = [
  "admin_help", "admin_stats", "admin_pause", "admin_leads",
  "admin_persona", "admin_persona_set", "admin_company", "admin_company_set",
  "admin_model", "admin_model_set", "admin_stages", "admin_stage_set",
  "admin_behavior", "admin_invite", "admin_blacklist", "admin_unblacklist",
  "admin_typeform", "admin_typeform_sync", "admin_typeform_send",
  "admin_set_phone", "admin_unknown",
];

for (const nodeId of adminCommands) {
  workflow.addEdge(nodeId, "admin_done");
}

// Closer agent → schedule check
workflow.addEdge("closer_agent", "schedule_check");
workflow.addEdge("schedule_check", "schedule_call", { label: "schedule" });
workflow.addEdge("schedule_check", START, { label: "continue" }); // Loop back for more conversation

// Schedule flow
workflow.addEdge("schedule_call", "schedule_success");
workflow.addEdge("schedule_success", START); // Return to conversation

export default workflow;
