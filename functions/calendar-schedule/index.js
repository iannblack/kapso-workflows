/**
 * Calendar Schedule — agenda una llamada con un closer disponible.
 * 
 * Input: { phone, name, email, requestedTime? }
 * Output: { ok, closerName, slot: { start, end }, meetLink? }
 */

async function handler(request, env) {
  const body = await request.json();
  const { phone, name, email, requestedTime } = body;

  if (!phone) {
    return new Response(JSON.stringify({ ok: false, error: "phone required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "Google Calendar not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Find available closer (simple round-robin from env)
    const closerEmail = env.CLOSER_EMAIL || "";
    const closerName = env.CLOSER_NAME || "Closer";
    const closerRefreshToken = env.CLOSER_REFRESH_TOKEN || "";

    if (!closerRefreshToken) {
      return new Response(JSON.stringify({
        ok: false,
        error: "No closer has connected their Google Calendar yet. Use /invite command to invite a closer.",
      }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Get access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: closerRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Failed to refresh Google token. Closer may need to reconnect.",
      }), { headers: { "Content-Type": "application/json" } });
    }

    const accessToken = tokenData.access_token;

    // 3. Find available slot (next available 40-min window in business hours)
    const now = new Date();
    const timeMin = requestedTime || now.toISOString();
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ahead

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const eventsData = await eventsRes.json();
    const busySlots = (eventsData.items || [])
      .filter(e => e.start?.dateTime)
      .map(e => ({
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
      }));

    // Find first available 40-min slot
    const SLOT_DURATION = 40; // minutes
    const BUSINESS_START = 9; // 9 AM
    const BUSINESS_END = 18; // 6 PM
    const tz = "America/Lima";

    let slotStart = null;
    let cursor = new Date(timeMin);
    
    // Round to next 30-min boundary
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30);
    cursor.setSeconds(0);
    cursor.setMilliseconds(0);

    const maxIterations = 336; // 7 days * 48 half-hours
    for (let i = 0; i < maxIterations; i++) {
      const cursorLocal = new Date(cursor.toLocaleString("en-US", { timeZone: tz }));
      const hour = cursorLocal.getHours();
      const day = cursorLocal.getDay();

      // Skip weekends and outside business hours
      if (day === 0 || day === 6 || hour < BUSINESS_START || hour >= BUSINESS_END) {
        cursor.setMinutes(cursor.getMinutes() + 30);
        continue;
      }

      const slotEnd = new Date(cursor.getTime() + SLOT_DURATION * 60 * 1000);

      // Check if slot conflicts
      const conflicts = busySlots.filter(b => 
        (cursor >= b.start && cursor < b.end) ||
        (slotEnd > b.start && slotEnd <= b.end) ||
        (cursor <= b.start && slotEnd >= b.end)
      );

      if (conflicts.length === 0) {
        slotStart = cursor;
        break;
      }

      cursor.setMinutes(cursor.getMinutes() + 30);
    }

    if (!slotStart) {
      return new Response(JSON.stringify({
        ok: false,
        error: "No available slots found in the next 7 days.",
      }), { headers: { "Content-Type": "application/json" } });
    }

    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION * 60 * 1000);

    // 4. Create calendar event with Google Meet
    const eventRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Llamada 30X - ${name || phone}`,
          description: `Lead: ${name || "Sin nombre"} (${phone})${email ? `\nEmail: ${email}` : ""}\n\nAgendado automáticamente por 30X Bot.`,
          start: { dateTime: slotStart.toISOString(), timeZone: tz },
          end: { dateTime: slotEnd.toISOString(), timeZone: tz },
          conferenceData: {
            createRequest: {
              requestId: `30x-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
          attendees: [
            { email: closerEmail },
            ...(email ? [{ email }] : []),
          ],
        }),
      }
    );

    const eventData = await eventRes.json();
    const meetLink = eventData?.conferenceData?.entryPoints?.[0]?.uri || 
                     eventData?.hangoutLink || null;

    return new Response(JSON.stringify({
      ok: true,
      closerName,
      slot: {
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      },
      meetLink,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
