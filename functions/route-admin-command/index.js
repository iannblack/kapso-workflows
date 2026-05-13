/**
 * Route Admin Command — parsea comandos admin y resuelve la acción.
 * 
 * Input: { message: "/command args..." }
 * Output: { action: "command_name", args: [...], decision: "route_label" }
 */

async function handler(request, env) {
  const body = await request.json();
  const message = body.message || body.vars?.user_reply || "";
  const trimmed = message.trim().slice(1).trim(); // Remove leading /
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Command map
  const commandMap = {
    "help": "help", "h": "help", "comandos": "help", "ayuda": "help",
    "stats": "stats", "status": "stats", "estado": "stats",
    "leads": "leads", "lead": "leads", "prospectos": "leads",
    "pause": "pause", "pausar": "pause",
    "persona": "persona", "personalidad": "persona",
    "persona_set": "persona_set",
    "company": "company", "empresa": "company", "conocimiento": "company",
    "company_set": "company_set",
    "model": "model", "modelo": "model",
    "model_set": "model_set",
    "stages": "stage", "etapas": "stage",
    "stage": "stage",
    "stage_set": "stage_set",
    "behavior": "behavior", "comportamiento": "behavior",
    "invite": "invite", "invitar": "invite",
    "blacklist": "blacklist", "bloquear": "blacklist", "ban": "blacklist",
    "unblacklist": "unblacklist", "desbloquear": "unblacklist", "unban": "unblacklist",
    "typeform": "typeform", "tf": "typeform",
    "typeform_sync": "typeform_sync", "tfsync": "typeform_sync",
    "typeform_send": "typeform_send", "tfsend": "typeform_send",
    "set_admin_phone": "set_admin", "admin": "set_admin",
  };

  const action = commandMap[cmd] || "unknown";

  return new Response(JSON.stringify({
    action,
    args,
    cmd,
    next_edge: action,
    vars: { admin_action: action, admin_args: args }
  }), { headers: { "Content-Type": "application/json" } });
}
