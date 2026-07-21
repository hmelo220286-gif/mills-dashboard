const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const base = `${SUPABASE_URL}/rest/v1/anotacoes`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // GET — retorna todas as anotações
  if (req.method === 'GET') {
    const r = await fetch(`${base}?select=frota,dp,ob`, { headers });
    const data = await r.json();
    // Converter para objeto { frota: {dp, ob} }
    const result = {};
    (data || []).forEach(row => { result[row.frota] = { dp: row.dp || '', ob: row.ob || '' }; });
    return res.status(200).json(result);
  }

  // POST — salvar/atualizar anotação
  if (req.method === 'POST') {
    const { frota, dp, ob } = req.body;
    if (!frota) return res.status(400).json({ error: 'frota obrigatória' });

    // Verificar se já existe
    const check = await fetch(`${base}?frota=eq.${encodeURIComponent(frota)}&select=id`, { headers });
    const existing = await check.json();

    if (existing && existing.length > 0) {
      // Atualizar
      await fetch(`${base}?frota=eq.${encodeURIComponent(frota)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ dp: dp || '', ob: ob || '', updated_at: new Date().toISOString() })
      });
    } else {
      // Inserir
      await fetch(base, {
        method: 'POST',
        headers,
        body: JSON.stringify({ frota, dp: dp || '', ob: ob || '', updated_at: new Date().toISOString() })
      });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
