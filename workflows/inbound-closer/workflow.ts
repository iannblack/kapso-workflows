/**
 * 30X Inbound Closer — versión 1.0
 * Flujo: mensaje entrante → hubspot lookup → AI agent → schedule si aplica
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

// Paso 1: obtener contexto de HubSpot
workflow.addNode("hubspot_lookup", {
  type: "function",
  functionSlug: "hubspot-lookup",
  saveResponseTo: "hubspot_data",
});

// Paso 2: AI agent — maneja toda la conversación
workflow.addNode("closer", {
  type: "agent",
  systemPrompt: `Eres Roberto Amaya, reclutador ejecutivo de 30X.

## Tu personalidad
Profesional directo y persuasivo. Respondes en párrafos fluidos, sin asteriscos, guiones ni markdown.

## Tu objetivo
Calificar leads de 30X y agendar llamadas de descubrimiento.

## Contexto del lead
{{vars.hubspot_data}}

## Reglas
1. Averigua nombre, empresa, rol y tamaño del equipo
2. Si el lead quiere agendar, usa send_notification_to_user con: "AGENDAR:<programa>"
3. Si pide un humano, usa handoff_to_human
4. Para pausar la conversación y esperar respuesta, usa enter_waiting
5. Cuando termines la interacción, usa complete_task

## Programas
- Inmersivo: 6 semanas, $6K USD
- AI Sales: automatización con IA
- Growth: estrategia de crecimiento`,
  providerModel: "deepseek-chat",
  maxIterations: 20,
  temperature: 0.7,
});

// Paso 3: agendar si corresponde
workflow.addNode("schedule", {
  type: "function",
  functionSlug: "calendar-schedule",
  saveResponseTo: "schedule_result",
});

// Paso 4: confirmación
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
