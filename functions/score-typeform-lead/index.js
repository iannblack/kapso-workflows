/**
 * Score Typeform Lead — parsea respuestas de Typeform,
 * asigna score y extrae datos del lead.
 * 
 * Input: { responses: [...], lastProcessedId: string }
 * Output: { newLeads: [{ phone, name, score, ... }], lastProcessedId }
 */

async function handler(request, env) {
  const body = await request.json();
  const responses = body.responses?.items || body.responses || [];
  const threshold = parseInt(env.TYPEFORM_SCORE_THRESHOLD || "7");

  if (!responses.length) {
    return new Response(JSON.stringify({
      newLeads: [],
      lastProcessedId: body.lastProcessedId || null,
    }), { headers: { "Content-Type": "application/json" } });
  }

  const leads = [];
  let lastId = body.lastProcessedId || "";

  for (const response of responses) {
    if (response.landing_id === lastId) break;

    const answers = {};
    for (const ans of response.answers || []) {
      const ref = ans.field?.ref || "";
      const value = ans.text || ans.email || ans.phone_number || 
                    ans.choice?.label || ans.number || 
                    ans.choices?.labels?.join(", ") || "";
      answers[ref] = value;
    }

    const phone = (answers["phone"] || answers["whatsapp"] || "").replace(/\D/g, "");
    const name = answers["name"] || answers["first_name"] || "";
    const email = answers["email"] || "";
    const company = answers["company"] || "";
    const role = answers["role"] || answers["position"] || "";
    const employees = answers["employees"] || answers["team_size"] || "";
    const revenue = answers["revenue"] || "";
    const interest = answers["program"] || answers["interest"] || "";
    const decisionMaker = answers["decision_maker"] || "";

    // Simple scoring
    let score = 0;
    if (name) score += 1;
    if (email) score += 1;
    if (company) score += 1;
    if (role) score += 1;
    if (["51-200", "201-500", "500+"].includes(employees)) score += 2;
    if (["500K-1M", "1M-5M", "5M+"].includes(revenue)) score += 2;
    if (interest) score += 1;
    if (["si", "sí", "yes", "true"].includes(decisionMaker.toLowerCase())) score += 1;

    leads.push({
      landingId: response.landing_id,
      submittedAt: response.submitted_at,
      phone,
      name,
      email,
      company,
      role,
      employeesRange: employees,
      revenueRange: revenue,
      programInterest: interest,
      score,
      qualified: score >= threshold,
    });

    lastId = response.landing_id;
  }

  return new Response(JSON.stringify({
    newLeads: leads.reverse(), // Oldest first
    lastProcessedId: lastId,
  }), { headers: { "Content-Type": "application/json" } });
}
