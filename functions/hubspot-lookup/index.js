/**
 * HubSpot Lookup — busca contacto en HubSpot.
 * 
 * Kapso Function Node payload:
 * {
 *   execution_context: { vars, system, context: { phone_number } },
 *   whatsapp_context: { conversation: { phone_number }, messages }
 * }
 * 
 * Returns: { contactId, contactName, email, ... } como vars
 */

async function handler(request, env) {
  const body = await request.json();

  // Extraer teléfono del contexto de Kapso
  const ctx = body.execution_context || {};
  const vars = ctx.vars || {};
  const waCtx = body.whatsapp_context || {};
  const conversation = waCtx.conversation || {};
  const context = ctx.context || {};

  const phone = (vars.phone || context.phone_number || conversation.phone_number || "").replace(/\D/g, "");

  if (!phone || phone.length < 10) {
    // No hay teléfono → devolver respuesta vacía
    return new Response(JSON.stringify({
      vars: {
        hubspot_contact_id: null,
        hubspot_name: null,
        hubspot_email: null,
        hubspot_lifecycle: null,
        hubspot_deal: null,
        hubspot_context: "Contacto nuevo — no encontrado en HubSpot.",
      }
    }), { headers: { "Content-Type": "application/json" } });
  }

  const HUBSPOT_TOKEN = env.HUBSPOT_API_KEY;
  if (!HUBSPOT_TOKEN) {
    return new Response(JSON.stringify({
      vars: {
        hubspot_contact_id: null,
        hubspot_name: null,
        hubspot_context: "HubSpot no configurado (falta HUBSPOT_API_KEY).",
      }
    }), { headers: { "Content-Type": "application/json" } });
  }

  try {
    // Buscar contacto por teléfono
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: "phone", operator: "CONTAINS_TOKEN", value: phone }] },
          { filters: [{ propertyName: "mobilephone", operator: "CONTAINS_TOKEN", value: phone }] },
        ],
        properties: ["firstname", "lastname", "email", "lifecyclestage", "phone", "mobilephone"],
        limit: 1,
      }),
    });

    if (!searchRes.ok) {
      return new Response(JSON.stringify({
        vars: { hubspot_context: `HubSpot search error: ${searchRes.status}` }
      }), { headers: { "Content-Type": "application/json" } });
    }

    const searchData = await searchRes.json();
    const contact = searchData?.results?.[0];

    if (!contact) {
      return new Response(JSON.stringify({
        vars: {
          hubspot_contact_id: null,
          hubspot_name: null,
          hubspot_email: null,
          hubspot_lifecycle: null,
          hubspot_deal: null,
          hubspot_context: "Contacto nuevo — no encontrado en HubSpot.",
        }
      }), { headers: { "Content-Type": "application/json" } });
    }

    const props = contact.properties || {};
    const name = [props.firstname || "", props.lastname || ""].filter(Boolean).join(" ");

    // Buscar deal asociado
    let dealInfo = null;
    try {
      const dealsRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}/associations/deals`,
        { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
      );
      if (dealsRes.ok) {
        const dealsData = await dealsRes.json();
        const firstDeal = dealsData?.results?.[0];
        if (firstDeal) {
          const dealRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/deals/${firstDeal.id}?properties=dealstage,amount`,
            { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
          );
          if (dealRes.ok) {
            const dealData = await dealRes.json();
            dealInfo = {
              id: firstDeal.id,
              stage: dealData.properties?.dealstage || null,
              amount: dealData.properties?.amount || null,
            };
          }
        }
      }
    } catch (e) {
      // Deal lookup es opcional
    }

    const contextBlock = [
      `Contacto: ${name} (${phone})`,
      props.email ? `Email: ${props.email}` : null,
      props.lifecyclestage ? `Lifecycle: ${props.lifecyclestage}` : null,
      dealInfo?.id ? `Deal ID: ${dealInfo.id}` : null,
      dealInfo?.stage ? `Deal stage: ${dealInfo.stage}` : null,
      dealInfo?.amount ? `Monto: $${dealInfo.amount}` : null,
    ].filter(Boolean).join("\n");

    return new Response(JSON.stringify({
      vars: {
        hubspot_contact_id: contact.id,
        hubspot_name: name,
        hubspot_email: props.email || null,
        hubspot_lifecycle: props.lifecyclestage || null,
        hubspot_deal: dealInfo?.id || null,
        hubspot_deal_stage: dealInfo?.stage || null,
        hubspot_context: contextBlock,
      }
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({
      vars: { hubspot_context: `Error: ${e.message}` }
    }), { headers: { "Content-Type": "application/json" } });
  }
}
