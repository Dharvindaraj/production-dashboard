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

function fixDate(dateStr) {
  if (!dateStr) return dateStr;
  // Handle D/MM/YYYY or DD/MM/YYYY -> YYYY-MM-DD (Malaysia format)
  var m = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    var day   = m[1].padStart(2,'0');
    var month = m[2].padStart(2,'0');
    var year  = m[3];
    return year + '-' + month + '-' + day;
  }
  // Handle YYYY-MM-DD but month and day might be swapped by AI
  // If AI returned YYYY-MM-DD, check if month > 12 which means it swapped
  var m2 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    var y = m2[1], mo = parseInt(m2[2]), d = parseInt(m2[3]);
    // If month > 12, AI swapped day and month - swap them back
    if (mo > 12) {
      return y + '-' + String(d).padStart(2,'0') + '-' + String(mo).padStart(2,'0');
    }
  }
  return dateStr;
}

function preFix(text) {
  // Pre-convert all DD/MM/YYYY dates in message before sending to AI
  return text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, function(match, d, m, y) {
    return y + '-' + m.padStart(2,'0') + '-' + d.padStart(2,'0');
  });
}

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
- date: extract date in YYYY-MM-DD format. IMPORTANT: Malaysia uses DD/MM/YYYY format always. So 07/06/2026 means 7th June 2026 = 2026-06-07. Never interpret as MM/DD/YYYY.
- shift: "morning" or "night"
- station: exact station name from message. Map variations like "X-ray" = "Xray 1", "Lay Up 1" = "Layup 1", "Lay Up 2" = "Layup 2"
- product: "LCM" or "LCS". If not mentioned and no LCS keyword, assume "LCM"
- m2: total m2 value. Priority order: 1) TOTAL PRESS M² line, 2) Total: line, 3) sum of individual lines. Ignore individual press breakdowns (Press 1, Press 2, Pm4, Pm6 etc)
- boards: board quantity. Priority order: 1) TOTAL PRESS Board Qty, 2) B.Qty, 3) Board Qty total line, 4) number in brackets like (2,397board). Always use the TOTAL not individual lines.
- station: VERY IMPORTANT - the station name is ALWAYS in the FIRST LINE of the message header, before the date.
  * "Buckle" or "Burkle" or "Buckle Press" = "Buckle press"
  * "Vigor press" or "Vigor" = "Vigor press"
  * "Routing" alone = "Routing 1"
  * NEVER use "Press", "Press A", "Press B", "Press 1", "Press 2", "Press 3", "Press 4" as station names
  * These are machine unit numbers INSIDE the station, not the station name itself
  * If you see PRESS A, PRESS B, PRESS C, PRESS D or PRESS 1,2,3,4 inside the message, it means machines within Vigor press or Buckle press
  * Always look at the very first word/line of the message for the station name
- If message has TOTAL PRESS section at bottom, use ONLY those Board Qty and M² values
- Ignore all individual Press A/B/C/D or Press 1/2/3/4 breakdowns
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
    const date    = fixDate(entry.date);
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
      'vigor press':'Vigor press','vigor':'Vigor press','vigour press':'Vigor press','vigour':'Vigor press',
      'buckle press':'Buckle press','buckle':'Buckle press','burkle':'Buckle press','burkle press':'Buckle press',
      'routing 1':'Routing 1','routing1':'Routing 1','routing':'Routing 1',
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

      const lcmPayload = {
        station_lcm_morning:         lcmMorn,
        station_lcm_morning_boards:  lcmMornB,
        station_lcm_night:           lcmNight,
        station_lcm_night_boards:    lcmNightB,
        stations_morning:            lcmMorn,
        stations_night:              lcmNight,
        updated_at:                  new Date().toISOString(),
      };

      if (current.entry_date) {
        await fetch(`${SUPABASE_URL}/rest/v1/daily_entries?entry_date=eq.${date}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lcmPayload),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/daily_entries`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(Object.assign({ entry_date: date }, lcmPayload)),
        });
      }
    } else {
      var lcsMorn  = current.station_lcs_morning        || {};
      var lcsNight = current.station_lcs_night          || {};
      var lcsMornB = current.station_lcs_morning_boards || {};
      var lcsNightB= current.station_lcs_night_boards   || {};

      if (isMorning) { lcsMorn[station]=m2;  lcsMornB[station]=boards; }
      else           { lcsNight[station]=m2; lcsNightB[station]=boards; }

      const lcsPayload = {
        station_lcs_morning:         lcsMorn,
        station_lcs_morning_boards:  lcsMornB,
        station_lcs_night:           lcsNight,
        station_lcs_night_boards:    lcsNightB,
        updated_at:                  new Date().toISOString(),
      };

      if (current.entry_date) {
        await fetch(`${SUPABASE_URL}/rest/v1/daily_entries?entry_date=eq.${date}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lcsPayload),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/daily_entries`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(Object.assign({ entry_date: date }, lcsPayload)),
        });
      }
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
    const fixedText = preFix(text);
    console.log('PRE-FIXED TEXT:', fixedText.slice(0,100));
    const extracted = await extractWithGroq(fixedText);
    console.log('EXTRACTED:', JSON.stringify(extracted).slice(0,200));
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
