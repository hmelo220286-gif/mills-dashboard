const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Variáveis não configuradas' });
  }

  const base = `${SUPABASE_URL}/rest/v1/anotacoes`;
  const hdrs = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=frota,dp,ob`, { headers: hdrs });
      const text = await r.text();
      if (!r.ok) return res.status(200).json({ error: `GET falhou: ${r.status}`, detail: text.substring(0,200) });
      const rows = JSON.parse(text);
      const result = {};
      rows.forEach(row => { if (row.frota) result[row.frota] = { dp: row.dp || '', ob: row.ob || '' }; });
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
      const { frota, field, value } = body || {};
      if (!frota || !field) return res.status(400).json({ error: 'frota e field obrigatórios' });

      const checkR = await fetch(`${base}?frota=eq.${encodeURIComponent(frota)}&select=id`, { headers: hdrs });
      const existing = JSON.parse(await checkR.text());
      let saveR;

      if (existing.length > 0) {
        const update = {};
        update[field] = value;
        saveR = await fetch(`${base}?frota=eq.${encodeURIComponent(frota)}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(update) });
      } else {
        const insert = { frota, dp: '', ob: '' };
        insert[field] = value;
        saveR = await fetch(base, { method: 'POST', headers: { ...hdrs, 'Prefer': 'return=minimal' }, body: JSON.stringify(insert) });
      }

      const saveText = await saveR.text();
      if (!saveR.ok) return res.status(200).json({ error: `SAVE falhou: ${saveR.status}`, detail: saveText.substring(0,200) });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(200).json({ error: 'Exceção: ' + err.message });
  }
}
