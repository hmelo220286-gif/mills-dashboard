const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verificar variáveis de ambiente
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Variáveis de ambiente não configuradas' });
  }

  const base = `${SUPABASE_URL}/rest/v1/anotacoes`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    // GET — retorna todas as anotações
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=frota,dp,ob&order=frota`, { headers });
      if (!r.ok) {
        const err = await r.text();
        return res.status(r.status).json({ error: err });
      }
      const data = await r.json();
      const result = {};
      (data || []).forEach(row => {
        if (row.frota) result[row.frota] = { dp: row.dp || '', ob: row.ob || '' };
      });
      return res.status(200).json(result);
    }

    // POST — salvar/atualizar anotação
    if (req.method === 'POST') {
      let body = req.body;
      // Garantir que body está parseado
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) { body = {}; }
      }
      const { frota, dp, ob } = body || {};
      if (!frota) return res.status(400).json({ error: 'frota obrigatória' });

      // Upsert — insere ou atualiza em uma única operação
      const upsertHeaders = {
        ...headers,
        'Prefer': 'resolution=merge-duplicates,return=representation'
      };
      const r = await fetch(base, {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify({
          frota: frota,
          dp: dp || '',
          ob: ob || '',
          updated_at: new Date().toISOString()
        })
      });
      if (!r.ok) {
        const err = await r.text();
        return res.status(r.status).json({ error: err });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
