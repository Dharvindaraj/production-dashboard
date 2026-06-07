const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY   = process.env.GROQ_API_KEY;
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY   = process.env.VITE_SUPABASE_ANON_KEY;

const STATION_MAP = {
  'oxide': 'Oxide', 'glicap': 'Glicap', 'baking': 'Baking',
  'rivet': 'Rivet', 'setup': 'Setup', 'preparation': 'Preparation',
  'pulse bonding': 'Pulse bonding', 'pulse': 'Pulse bonding',
  'ccd welding': 'CCD Welding', 'ccd': 'CCD Welding',
  'layup 1': 'Layup 1', 'lay up 1': 'Layup 1', 'layup1': 'Layup 1',
  'layup 2': 'Layup 2', 'lay up 2': 'Layup 2', 'layup2': 'Layup 2',
  'vigor press': 'Vigor press', 'vigor': 'Vigor press',
  'buckle press': 'Buckle press', 'buckle': 'Buckle press',
  'routing 1': 'Routing 1', 'routing1': 'Routing 1',
  'routing 2': 'Routing 2', 'routing2': 'Routing 2',
  'xray 1': 'Xray 1', 'xray1': 'Xray 1', 'x-ray 1': 'Xray 1', 'x-ray': 'Xray 1', 'xray': 'Xray 1',
  'xray 2': 'Xray 2', 'xray2': 'Xray 2', 'x-ray 2': 'Xray 2',
  'ttst': 'TTST',
};

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
  });
}

async function extractWithGroq(message) {
  const systemPrompt = `You are a production data extractor for a PCB manufacturing factory called Masslam.
Extract structured data from operator messages and return ONLY valid JSON.

Rules:
- date: extract date in YYYY-MM-DD format. If format is D/MM/YYYY or DD/MM/YYYY convert it.
- shift: "morning" or "night"
- station: exact station name from message. Map variations like "X-ray" = "Xray 1", "Lay Up 1" = "Layup 1", "Lay Up 2" = "Layup 2"
- product: "LCM" or "LCS". If not mentioned and no LCS keyword, assume "LCM"
- m2: total m2 value. If there is a Total line use that. Ignore individual machine breakdowns (Pm4, Pm6 etc)
- boards: board quantity. Look for B.Qty, Board Qty, or number in brackets like (2,397board) or (360board)
- reason: any reason or note mentioned. null if none.
- confidence: "high" if all fields clear, "low" if anything uncertain

Return JSON only, no explanation:
{
  "date": "2026-06-06",
  "shift": "night",
  "station": "Xray 1",
  "product": "LCM",
  "m2": 175.0,
  "boards": 748,
  "reason": null,
  "confidence": "high",
  "clarification_needed": null
}

If something is unclear, set clarification_needed to a short question string.
If multiple products in one message (both LCM and LCS), return array of two objects.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  const text = data.choices[0].message.content.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function saveToSupabase(extracted) {
  const entries = Array.isArray(extracted) ? extracted : [extracted];

  for (const entry of entries) {
    const date    = entry.date;
    const shift   = entry.shift;
    const m2      = entry.m2 || 0;
    const boards  = entry.boards || 0;
    const stnMap  = {
      'layup 1':'Layup 1','lay up 1':'Layup 1','layup1':'Layup 1',
      'layup 2':'Layup 2','lay up 2':'Layup 2','layup2':'Layup 2',
      'oxide':'Oxide','glicap':'Glicap','baking':'Baking','rivet':'Rivet',
      'setup':'Setup','preparation':'Preparation',
      'pulse bonding':'Pulse bonding','pulse':'Pulse bonding',
      'ccd welding':'CCD Welding','ccd':'CCD Welding',
      'vigor press':'Vigor press','vigor':'Vigor press',
      'buckle press':'Buckle press','buckle':'Buckle press',
      'routing 1':'Routing 1','routing1':'Routing 1',
      'routing 2':'Routing 2','routing2':'Routing 2',
      'xray 1':'Xray 1','xray1':'Xray 1','x-ray 1':'Xray 1','x-ray':'Xray 1','xray':'Xray 1',
      'xray 2':'Xray 2','xray2':'Xray 2','x-ray 2':'Xray 2',
      'ttst':'TTST',
    };
    const station = stnMap[(entry.station||'').toLowerCase().trim()] || entry.station;

    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_entries?entry_date=eq.${date}&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const existing = await getRes.json();
    const current  = existing && existing.length > 0 ? existing[0] : {};

    const isMorning = shift === 'morning';

    if (entry.product === 'LCM') {
      var lcmMorn  = current.station_lcm_morning        || {};
      var lcmNight = current.station_lcm_night          || {};
      var lcmMornB = current.station_lcm_morning_boards || {};
      var lcmNightB= current.station_lcm_night_boards   || {};

      if (isMorning) { lcmMorn[station]=m2;  lcmMornB[station]=boards; }
      else           { lcmNight[station]=m2; lcmNightB[station]=boards; }

      await fetch(`${SUPABASE_URL}/rest/v1/daily_entries`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          entry_date:                  date,
          station_lcm_morning:         lcmMorn,
          station_lcm_morning_boards:  lcmMornB,
          station_lcm_night:           lcmNight,
          station_lcm_night_boards:    lcmNightB,
          stations_morning:            lcmMorn,
          stations_night:              lcmNight,
          updated_at:                  new Date().toISOString(),
        }),
      });
    } else {
      var lcsMorn  = current.station_lcs_morning        || {};
      var lcsNight = current.station_lcs_night          || {};
      var lcsMornB = current.station_lcs_morning_boards || {};
      var lcsNightB= current.station_lcs_night_boards   || {};

      if (isMorning) { lcsMorn[station]=m2;  lcsMornB[station]=boards; }
      else           { lcsNight[station]=m2; lcsNightB[station]=boards; }

      await fetch(`${SUPABASE_URL}/rest/v1/daily_entries`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          entry_date:                  date,
          station_lcs_morning:         lcsMorn,
          station_lcs_morning_boards:  lcsMornB,
          station_lcs_night:           lcsNight,
          station_lcs_night_boards:    lcsNightB,
          updated_at:                  new Date().toISOString(),
        }),
      });
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const body    = req.body;
  const message = body.message;
  if (!message) return res.status(200).json({ ok: true });

  const chatId = message.chat.id;
  const text   = message.text || '';

  if (!text) return res.status(200).json({ ok: true });

  if (text === '/start') {
    await sendTelegram(chatId,
      '👋 <b>Masslam Production Bot</b>\n\nSend me your production report and I will save it to the dashboard automatically!\n\nJust send your normal message.'
    );
    return res.status(200).json({ ok: true });
  }

  try {
    await sendTelegram(chatId, '⏳ Reading your message...');
    const extracted = await extractWithGroq(text);
    const entries   = Array.isArray(extracted) ? extracted : [extracted];

    for (const entry of entries) {
      if (entry.clarification_needed) {
        await sendTelegram(chatId, '❓ ' + entry.clarification_needed);
        return res.status(200).json({ ok: true });
      }
    }

    await saveToSupabase(extracted);

    let reply = '✅ <b>Saved to dashboard!</b>\n\n';
    for (const entry of entries) {
      reply += `📅 ${entry.date} · ${entry.shift} shift\n`;
      reply += `🏭 Station: ${entry.station}\n`;
      reply += `📦 ${entry.product}: ${entry.m2} m² · ${entry.boards} boards\n`;
      if (entry.reason) reply += `📝 Reason: ${entry.reason}\n`;
      reply += '\n';
    }
    await sendTelegram(chatId, reply);

  } catch (err) {
    console.error('Bot error:', err);
    await sendTelegram(chatId, '❌ Error reading message. Please try again.');
  }

  return res.status(200).json({ ok: true });
}
