/**
 * 30X Typeform Sync — Kapso Workflow
 *
 * Scheduled workflow that:
 * 1. Syncs new Typeform submissions to the project database
 * 2. Generates personalized AI messages for qualified leads
 * 3. Sends WhatsApp messages via Kapso
 *
 * Trigger: scheduled (every 15 min) or manual via API
 */

import { START, Workflow } from "@kapso/workflows";

const workflow = new Workflow("typeform-sync", {
  name: "Typeform Sync",
  status: "active",
});

// ── Trigger: API call (cron from Kapso scheduler) ────────────────────────
workflow.addTrigger({
  type: "api_call",
  active: true,
});

// ── Start node ───────────────────────────────────────────────────────────
workflow.addNode(START, {
  position: { x: 100, y: 100 },
});

// ── Sync Typeform leads ──────────────────────────────────────────────────
workflow.addNode("fetch_typeform", {
  type: "webhook",
  url: "https://api.typeform.com/forms/wZuIIvZt/responses?page_size=100&completed=true",
  method: "GET",
  headers: {
    "Authorization": "Bearer {{vars.TYPEFORM_TOKEN}}",
  },
  saveResponseTo: "typeform_responses",
});

// ── Process through scoring function ─────────────────────────────────────
workflow.addNode("score_leads", {
  type: "function",
  functionSlug: "score-typeform-lead",
});

// ── Decide: qualified or not ─────────────────────────────────────────────
workflow.addNode("qualified_check", {
  type: "decide",
  decisionType: "function",
  functionSlug: "check-lead-qualification",
  conditions: [
    { label: "qualified", description: "Lead score meets threshold" },
    { label: "low_score", description: "Lead score below threshold" },
    { label: "no_new", description: "No new leads to process" },
  ],
});

// ── Generate AI message ──────────────────────────────────────────────────
workflow.addNode("generate_message", {
  type: "webhook",
  url: "https://api.deepseek.com/v1/chat/completions",
  method: "POST",
  headers: {
    "Authorization": "Bearer {{vars.DEEPSEEK_API_KEY}}",
    "Content-Type": "application/json",
  },
  bodyTemplate: {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: [
          "Eres Roberto Amaya, reclutador ejecutivo de 30X.",
          "Genera un mensaje de WhatsApp personalizado para un lead de Typeform.",
          "Sé directo, profesional y persuasivo.",
          "Máximo 300 caracteres.",
          "No uses markdown ni asteriscos.",
          "Haz referencia al interés específico del lead basado en sus respuestas.",
        ].join("\n"),
      },
      {
        role: "user",
        content: "Genera mensaje para: {{vars.current_lead_json}}",
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  },
  saveResponseTo: "ai_message",
});

// ── Send WhatsApp via Kapso ──────────────────────────────────────────────
workflow.addNode("send_whatsapp", {
  type: "send_text",
  message: "{{vars.generated_message}}",
  toPhoneNumber: "{{vars.lead_phone}}",
  phoneNumberId: "948987948303781",
});

// ── Mark as processed ────────────────────────────────────────────────────
workflow.addNode("mark_processed", {
  type: "function",
  functionSlug: "mark-lead-processed",
});

// ── Log unqualified ──────────────────────────────────────────────────────
workflow.addNode("log_skipped", {
  type: "function",
  functionSlug: "log-skipped-lead",
});

// ── Edges ────────────────────────────────────────────────────────────────
workflow.addEdge(START, "fetch_typeform");
workflow.addEdge("fetch_typeform", "score_leads");
workflow.addEdge("score_leads", "qualified_check");

workflow.addEdge("qualified_check", "generate_message", { label: "qualified" });
workflow.addEdge("qualified_check", "log_skipped", { label: "low_score" });
workflow.addEdge("qualified_check", "log_skipped", { label: "no_new" });

workflow.addEdge("generate_message", "send_whatsapp");
workflow.addEdge("send_whatsapp", "mark_processed");
workflow.addEdge("mark_processed", "qualified_check"); // Loop for next lead

// End nodes terminate the workflow (no outgoing edges)
// log_skipped terminates

export default workflow;
