/**
 * Route Admin Command — parsea comandos y decide acción.
 * Decide function: debe devolver next_edge.
 */
async function handler(request, env) {
  const body = await request.json();
  const ctx = body.execution_context || {};
  const vars = ctx.vars || {};
  const msg = vars.user_reply || vars.inbound_message || "";
  const trimmed = msg.trim();
  
  if (!trimmed.startsWith("/")) {
    return new Response(JSON.stringify({
      next_edge: "not_command",
      vars: {}
    }), { headers: { "Content-Type": "application/json" } });
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const map = {
    "help": "help", "h": "help", "ayuda": "help", "comandos": "help",
    "stats": "stats", "status": "stats", "estado": "stats",
    "pause": "pause", "pausar": "pause",
    "persona": "persona", "personalidad": "persona",
    "persona_set": "persona_set",
    "company": "company", "empresa": "company",
    "company_set": "company_set",
    "model": "model", "modelo": "model",
    "model_set": "model_set",
    "invite": "invite", "invitar": "invite",
    "blacklist": "blacklist", "bloquear": "blacklist",
    "unblacklist": "unblacklist", "desbloquear": "unblacklist",
    "typeform": "typeform", "tf": "typeform",
    "set_admin_phone": "set_admin", "admin": "set_admin",
  };

  const action = map[cmd] || "unknown";

  return new Response(JSON.stringify({
    next_edge: action,
    vars: { admin_action: action, admin_args: args.join(" "), admin_cmd: cmd }
  }), { headers: { "Content-Type": "application/json" } });
}
