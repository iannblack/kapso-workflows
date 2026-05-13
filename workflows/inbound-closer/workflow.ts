/**
 * 30X Inbound Closer — Kapso Workflow
 *
 * Cada mensaje entrante de WhatsApp ejecuta este workflow una vez.
 * - Si es admin → ejecuta comando y responde
 * - Si es lead → AI agent conversa, agenda si corresponde
 */

import { START, Workflow } from "@kapso/workflows";

const workflow = new Workflow("inbound-closer", {
  name: "Inbound Closer",
  status: "active",
});

// ── Trigger ─────────────────────────────────────────────────────────────
workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: "948987948303781",
});

// ── Nodos ───────────────────────────────────────────────────────────────

// Start node
workflow.addNode(START, {
  position: { x: 100, y: 100 },
});

// Admin check — function decide
workflow.addNode("admin_check", {
  type: "decide",
  decisionType: "function",
  functionSlug: "check-is-admin",
  conditions: [
    { label: "admin", description: "Sender is admin and message starts with /" },
    { label: "lead", description: "Regular lead message" },
  ],
});

// Admin command router
workflow.addNode("admin_router", {
  type: "decide",
  decisionType: "function",
  functionSlug: "route-admin-command",
  conditions: [
    { label: "help", description: "/help" },
    { label: "stats", description: "/stats" },
    { label: "pause", description: "/pause" },
    { label: "persona", description: "/persona" },
    { label: "persona_set", description: "/persona_set" },
    { label: "company", description: "/company" },
    { label: "company_set", description: "/company_set" },
    { label: "model", description: "/model" },
    { label: "model_set", description: "/model_set" },
    { label: "stage", description: "/stage or /stages" },
    { label: "stage_set", description: "/stage_set" },
    { label: "behavior", description: "/behavior" },
    { label: "invite", description: "/invite" },
    { label: "blacklist", description: "/blacklist" },
    { label: "unblacklist", description: "/unblacklist" },
    { label: "typeform", description: "/typeform" },
    { label: "set_admin", description: "/set_admin_phone" },
    { label: "unknown", description: "Unrecognized command" },
  ],
});

// Admin response nodes
workflow.addNode("say_help", {
  type: "send_text",
  message:
    "📋 *Comandos:*\n/stats /pause /leads /persona /persona_set <texto>\n/company /company_set <texto> /model /model_set\  \n/stages /stage_set <key> <text> /behavior\n/invite <email> /blacklist <num> /typeform\n/set_admin_phone <num> /help",
});

workflow.addNode("say_stats", {
  type: "send_text",
  message:
    "📊 *30X Bot — Estado*\n\nModelo: {{vars.ai_model}}\nPausa global: {{vars.bot_paused}}\nLeads: {{vars.lead_count}}\n\n✅ Comando procesado.",
});

workflow.addNode("say_pause", {
  type: "send_text",
  message: "⏸️ Alternando pausa global...",
});

workflow.addNode("say_persona", {
  type: "send_text",
  message: "🧠 *Personalidad del Closer*\n\n{{vars.persona_content}}",
});

workflow.addNode("say_persona_set", {
  type: "send_text",
  message: "✅ Personalidad actualizada.",
});

workflow.addNode("say_company", {
  type: "send_text",
  message: "🏢 *Conocimiento de 30X*\n\n{{vars.company_content}}",
});

workflow.addNode("say_company_set", {
  type: "send_text",
  message: "✅ Conocimiento de empresa actualizado.",
});

workflow.addNode("say_model", {
  type: "send_text",
  message:
    "🤖 Modelo: {{vars.ai_model}}\nTokens: {{vars.ai_max_tokens}}\nTemperatura: {{vars.ai_temperature}}",
});

workflow.addNode("say_model_set", {
  type: "send_text",
  message: "✅ Modelo actualizado.",
});

workflow.addNode("say_stage", {
  type: "send_text",
  message: "📋 Playbook de etapa {{vars.stage_key}}: {{vars.stage_content}}",
});

workflow.addNode("say_stage_set", {
  type: "send_text",
  message: "✅ Playbook de etapa actualizado.",
});

workflow.addNode("say_behavior", {
  type: "send_text",
  message: "⚙️ Comportamiento: {{vars.behavior_summary}}",
});

workflow.addNode("say_invite", {
  type: "send_text",
  message: "📧 Invitación enviada a {{vars.invite_email}}.",
});

workflow.addNode("say_blacklist", {
  type: "send_text",
  message: "⛔ Número {{vars.blacklist_phone}} bloqueado.",
});

workflow.addNode("say_unblacklist", {
  type: "send_text",
  message: "✅ Número {{vars.unblacklist_phone}} desbloqueado.",
});

workflow.addNode("say_typeform", {
  type: "send_text",
  message: "📋 Typeform: {{vars.typeform_status}}",
});

workflow.addNode("say_set_admin", {
  type: "send_text",
  message: "✅ Número admin configurado.",
});

workflow.addNode("say_unknown", {
  type: "send_text",
  message: "❓ Comando no reconocido. Usá /help.",
});

// Lead flow — HubSpot context fetch
workflow.addNode("fetch_hubspot", {
  type: "function",
  functionSlug: "hubspot-lookup",
});

// Lead flow — AI closer agent
workflow.addNode("closer_agent", {
  type: "agent",
  systemPrompt: `Eres Roberto Amaya, reclutador ejecutivo de 30X.

## Tu personalidad
- Profesional directo y persuasivo
- No usas asteriscos, guiones, ni markdown
- Respondes en párrafos fluidos y naturales

## Tu objetivo
Calificar leads y agendar llamadas de descubrimiento.

## Contexto del prospecto
{{vars.hubspot_context}}

## Reglas
1. Siempre averigua nombre, empresa, rol y tamaño del equipo
2. Si el lead muestra interés en agendar, usa la herramienta send_notification_to_user con el texto: "AGENDAR:<programa>"
3. Si el lead pide un humano, usa handoff_to_human
4. No inventes información que no sepas

## Programas
- Inmersivo: 6 semanas, $6K USD
- AI Sales: automatización con IA
- Growth: estrategia de crecimiento`,
  providerModelId: "deepseek-chat",
  maxIterations: 10,
  temperature: 0.7,
});

// Schedule check
workflow.addNode("schedule_check", {
  type: "decide",
  decisionType: "ai",
  providerModelId: "deepseek-chat",
  conditions: [
    { label: "schedule", description: "Lead wants to schedule a call" },
    { label: "conversation", description: "Continue normal conversation" },
  ],
});

// Google Calendar scheduling
workflow.addNode("schedule_call", {
  type: "function",
  functionSlug: "calendar-schedule",
});

workflow.addNode("say_scheduled", {
  type: "send_text",
  message:
    "✅ *¡Agendado!*\n\nCloser: {{vars.closer_name}}\nFecha: {{vars.slot_start}}\nLink: {{vars.meet_link}}\n\nTe esperamos. 🚀",
});

// Send AI response to lead
workflow.addNode("send_reply", {
  type: "send_text",
  message: "{{vars.ai_response}}",
});

// ── Edges ───────────────────────────────────────────────────────────────
workflow.addEdge(START, "admin_check");

// Admin check
workflow.addEdge("admin_check", "admin_router", { label: "admin" });
workflow.addEdge("admin_check", "fetch_hubspot", { label: "lead" });

// Admin commands
workflow.addEdge("admin_router", "say_help", { label: "help" });
workflow.addEdge("admin_router", "say_stats", { label: "stats" });
workflow.addEdge("admin_router", "say_pause", { label: "pause" });
workflow.addEdge("admin_router", "say_persona", { label: "persona" });
workflow.addEdge("admin_router", "say_persona_set", { label: "persona_set" });
workflow.addEdge("admin_router", "say_company", { label: "company" });
workflow.addEdge("admin_router", "say_company_set", { label: "company_set" });
workflow.addEdge("admin_router", "say_model", { label: "model" });
workflow.addEdge("admin_router", "say_model_set", { label: "model_set" });
workflow.addEdge("admin_router", "say_stage", { label: "stage" });
workflow.addEdge("admin_router", "say_stage_set", { label: "stage_set" });
workflow.addEdge("admin_router", "say_behavior", { label: "behavior" });
workflow.addEdge("admin_router", "say_invite", { label: "invite" });
workflow.addEdge("admin_router", "say_blacklist", { label: "blacklist" });
workflow.addEdge("admin_router", "say_unblacklist", { label: "unblacklist" });
workflow.addEdge("admin_router", "say_typeform", { label: "typeform" });
workflow.addEdge("admin_router", "say_set_admin", { label: "set_admin" });
workflow.addEdge("admin_router", "say_unknown", { label: "unknown" });

// Lead flow
workflow.addEdge("fetch_hubspot", "closer_agent");
workflow.addEdge("closer_agent", "schedule_check");
workflow.addEdge("schedule_check", "schedule_call", { label: "schedule" });
workflow.addEdge("schedule_check", "send_reply", { label: "conversation" });
workflow.addEdge("schedule_call", "say_scheduled");

export default workflow;
