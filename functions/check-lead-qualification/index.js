/**
 * Check Lead Qualification — itera leads calificados y decide acción.
 * 
 * Input: { scoredLeads: [...], processedIndex: number }
 * Output: { decision, lead: {...}, nextIndex }
 */

async function handler(request, env) {
  const body = await request.json();
  const leads = body.scoredLeads || body.newLeads || [];
  const processedIndex = body.processedIndex || 0;

  if (processedIndex >= leads.length) {
    return new Response(JSON.stringify({
      next_edge: "no_new",
      lead: null,
      nextIndex: processedIndex,
    }), { headers: { "Content-Type": "application/json" } });
  }

  const lead = leads[processedIndex];

  if (!lead.qualified) {
    return new Response(JSON.stringify({
      next_edge: "low_score",
      lead,
      nextIndex: processedIndex + 1,
    }), { headers: { "Content-Type": "application/json" } });
  }

  // Check if already processed
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const alreadySent = false;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/typeform_leads?landing_id=eq.${lead.landingId}&select=kapso_sent`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const existing = await res.json();
      if (existing?.[0]?.kapso_sent) {
        return new Response(JSON.stringify({
          next_edge: "no_new",
          lead,
          nextIndex: processedIndex + 1,
        }), { headers: { "Content-Type": "application/json" } });
      }
    } catch {}
  }

  return new Response(JSON.stringify({
    next_edge: "qualified",
    lead,
    nextIndex: processedIndex + 1,
  }), { headers: { "Content-Type": "application/json" } });
}
