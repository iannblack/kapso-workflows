/**
 * Check Is Admin — verifica si el remitente es admin
 * y si el mensaje comienza con / (comando).
 * 
 * Input: { phone, message, adminPhone }
 * Output: { isAdmin: bool, isCommand: bool, decision: "admin_command" | "normal_message" }
 */

async function handler(request, env) {
  const body = await request.json();
  
  const phone = (body.phone || body.context?.phone_number || "").replace(/\D/g, "");
  const message = body.message || body.vars?.user_reply || "";
  const adminPhone = body.adminPhone || env.ADMIN_PHONE || "";

  const cleanAdmin = adminPhone.replace(/\D/g, "");
  const isAdmin = cleanAdmin ? phone === cleanAdmin : false;
  const isCommand = isAdmin && message.trim().startsWith("/");

  return new Response(JSON.stringify({
    isAdmin,
    isCommand,
    decision: isCommand ? "admin_command" : "normal_message",
  }), { headers: { "Content-Type": "application/json" } });
}
