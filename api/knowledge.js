// api/knowledge.js — write/read the knowledge store with the service key.
// Keeps the Supabase key server-side: nothing that syncs needs a credential on disk.
//
//   GET  /api/knowledge?ingested=1        -> { sources: { "<source>:<source_id>": maxChunk } }
//   GET  /api/knowledge?q=term&limit=10   -> { results: [...] }  (full-text)
//   POST /api/knowledge { rows: [ ... ] } -> { upserted: n }
//
// Row shape: { source, source_id, chunk_index, title, category, occurred_on, summary, content, entities[] }
// Upsert is on (source, source_id, chunk_index) so re-running a sync never duplicates.

const ALLOWED_SOURCES = ['cowork', 'claude_export', 'file', 'manual'];
const MAX_ROWS = 200;

function rest(path, init = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL / SUPABASE_SERVICE_KEY' });
  }

  try {
    if (req.method === 'GET') {
      // What has already been ingested, so the sync can skip it.
      if (req.query.ingested) {
        const r = await rest('knowledge?select=source,source_id,chunk_index&limit=10000');
        if (!r.ok) throw new Error('read ' + r.status + ' ' + (await r.text()).slice(0, 200));
        const rows = await r.json();
        const sources = {};
        rows.forEach(x => {
          const k = x.source + ':' + x.source_id;
          sources[k] = Math.max(sources[k] || 0, x.chunk_index || 0);
        });
        return res.status(200).json({ sources, total_chunks: rows.length });
      }

      const q = (req.query.q || '').toString().replace(/[()&|!:*']/g, ' ').trim();
      if (!q) return res.status(400).json({ error: 'q or ingested required' });
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
      const r = await rest('knowledge?select=title,category,occurred_on,summary,source&tsv=wfts.' +
        encodeURIComponent(q) + '&limit=' + limit + '&order=occurred_on.desc');
      if (!r.ok) throw new Error('search ' + r.status);
      return res.status(200).json({ results: await r.json() });
    }

    if (req.method === 'POST') {
      const rows = (req.body && req.body.rows) || [];
      if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'rows required' });
      if (rows.length > MAX_ROWS) return res.status(400).json({ error: 'max ' + MAX_ROWS + ' rows per call' });

      const clean = [];
      for (const r of rows) {
        if (!r || !r.source || !r.source_id) return res.status(400).json({ error: 'each row needs source + source_id' });
        if (!ALLOWED_SOURCES.includes(r.source)) return res.status(400).json({ error: 'bad source: ' + r.source });
        if (!r.summary && !r.content) return res.status(400).json({ error: 'row needs summary or content' });
        clean.push({
          source: r.source,
          source_id: String(r.source_id).slice(0, 300),
          chunk_index: Number.isFinite(r.chunk_index) ? r.chunk_index : 0,
          title: (r.title || '').slice(0, 300) || null,
          category: (r.category || '').slice(0, 60) || null,
          occurred_on: r.occurred_on || null,
          summary: (r.summary || '').slice(0, 8000) || null,
          content: (r.content || '').slice(0, 40000) || null,
          entities: Array.isArray(r.entities) ? r.entities.slice(0, 40) : null,
        });
      }

      const r = await rest('knowledge?on_conflict=source,source_id,chunk_index', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(clean),
      });
      if (!r.ok) throw new Error('upsert ' + r.status + ' ' + (await r.text()).slice(0, 300));
      return res.status(200).json({ upserted: clean.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'knowledge error' });
  }
}
