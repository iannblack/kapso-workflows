/**
 * HubSpot Lookup — busca contacto por teléfono en HubSpot.
 * 
 * Input: { phone: "519XXXXXXXX" }
 * Output: { contactId, contactName, email, lifecycleStage, dealId, dealStage, dealAmount }
 */

async function handler(request, env) {
  const body = await request.json();
  const phone = (body.phone || "").replace(/\D/g, "");
  
  if (!phone || phone.length < 10) {
    return new Response(JSON.stringify({
      contactId: null,
      contactName: null,
      email: null,
      lifecycleStage: null,
      dealId: null,
      dealStage: null,
      dealAmount: null,
      error: "Phone number required",
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const HUBSPOT_TOKEN = env.HUBSPOT_API_KEY;
  if (!HUBSPOT_TOKEN) {
    return new Response(JSON.stringify({ error: "HubSpot not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Search by phone
    const searchRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: "phone", operator: "CONTAINS_TOKEN", value: phone },
              ],
            },
            {
              filters: [
                { propertyName: "mobilephone", operator: "CONTAINS_TOKEN", value: phone },
              ],
            },
          ],
          properties: ["firstname", "lastname", "email", "lifecyclestage", "phone", "mobilephone"],
          limit: 1,
        }),
      }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return new Response(JSON.stringify({ error: `HubSpot search: ${err}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchData = await searchRes.json();
    const contact = searchData?.results?.[0];
    
    if (!contact) {
      return new Response(JSON.stringify({
        contactId: null,
        contactName: null,
        email: null,
        lifecycleStage: null,
        dealId: null,
        dealStage: null,
        dealAmount: null,
      }), { headers: { "Content-Type": "application/json" } });
    }

    const props = contact.properties;
    const firstName = props?.firstname || "";
    const lastName = props?.lastname || "";
    const contactName = [firstName, lastName].filter(Boolean).join(" ");

    // Look for associated deal
    let dealId = null;
    let dealStage = null;
    let dealAmount = null;

    try {
      const dealsRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}/associations/deals`,
        { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
      );
      if (dealsRes.ok) {
        const dealsData = await dealsRes.json();
        const firstDeal = dealsData?.results?.[0];
        if (firstDeal) {
          dealId = firstDeal.id;
          const dealRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/deals/${firstDeal.id}?properties=dealstage,amount`,
            { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
          );
          if (dealRes.ok) {
            const dealData = await dealRes.json();
            dealStage = dealData.properties?.dealstage || null;
            dealAmount = dealData.properties?.amount || null;
          }
        }
      }
    } catch (e) {
      // Deal lookup is optional
    }

    return new Response(JSON.stringify({
      contactId: contact.id,
      contactName,
      email: props?.email || null,
      lifecycleStage: props?.lifecyclestage || null,
      dealId,
      dealStage,
      dealAmount,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
