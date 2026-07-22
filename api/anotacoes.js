const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const base = `${SUPABASE_URL}/rest/v1/anotacoes`;
  const hdrs = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=frota,dp,ob`, { headers: hdrs });
      const rows = await r.json();
      const result = {};
      (rows || []).forEach(row => {
        if (row.frota) result[row.frota] = { dp: row.dp || '', ob: row.ob || '' };
      });
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) { body = {}; }
      }
      const { frota, field, value } = body || {};
      if (!frota || !field) return res.status(400).json({ error: 'frota e field obrigatorios' });

      const update = {};
      update[field] = value;

      const patchR = await fetch(`${base}?frota=eq.${encodeURIComponent(frota)}`, {
        method: 'PATCH',
        headers: { ...hdrs, 'Prefer': 'return=representation' },
        body: JSON.stringify(update)
      });
      const patchData = await patchR.json();

      if (Array.isArray(patchData) && patchData.length === 0) {
        const insert = { frota, dp: '', ob: '' };
        insert[field] = value;
        const insR = await fetch(base, {
          method: 'POST',
          headers: { ...hdrs, 'Prefer': 'return=minimal' },
          body: JSON.stringify(insert)
        });
        if (!insR.ok) {
          const txt = await insR.text();
          return res.status(200).json({ error: `INSERT ${insR.status}`, detail: txt.substring(0,200) });
        }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'metodo nao permitido' });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
