import { Hono } from 'hono'
import { query } from '../../db.ts'
import { renderTokens } from '../../../web/src/app/renderers/index'

const app = new Hono()

// Generate share link for a page
app.post('/pages/:id', async (c) => {
  const pageId = c.req.param('id')
  const token = crypto.randomUUID().replace(/-/g, '')
  await query(`UPDATE pages SET share_token = $1 WHERE id = $2`, [token, pageId])
  const baseUrl = process.env.APP_URL || 'http://localhost:4200'
  return c.json({ shareUrl: `${baseUrl}/share/${token}`, token })
})

// View shared prototype (public — no auth)
app.get('/:token', async (c) => {
  const token = c.req.param('token')
  const result = await query(
    `SELECT p.name, p.page_type, p.tokens, pr.name as project_name
     FROM pages p JOIN projects pr ON pr.id::text = p.project_id
     WHERE p.share_token = $1`,
    [token]
  )

  if (!result.rows.length) {
    return c.html(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#999">
      <div style="text-align:center"><h2>Link expired or invalid</h2><p>This prototype link is no longer available.</p></div>
    </body></html>`)
  }

  const page = result.rows[0]
  if (!page.tokens) {
    return c.html(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#999">
      <div style="text-align:center"><h2>${page.name}</h2><p>Prototype not generated yet.</p></div>
    </body></html>`)
  }

  // Can't import Angular renderers from backend — return tokens as embedded page with Tailwind
  const tokensJson = JSON.stringify(page.tokens)
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name} — ${page.project_name} | Butterstack</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{margin:0;font-family:'Inter',system-ui,sans-serif}</style>
</head>
<body>
  <div style="background:#f9fafb;min-height:100vh">
    <div style="background:white;border-bottom:1px solid #e5e7eb;padding:8px 16px;display:flex;align-items:center;justify-content:between;font-size:12px;color:#9ca3af">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:24px;height:24px;background:#16a34a;border-radius:6px;display:flex;align-items:center;justify-content:center">
          <span style="color:white;font-weight:bold;font-size:12px">+</span>
        </div>
        <span style="font-weight:600;color:#111">${page.project_name}</span>
        <span style="color:#d1d5db">›</span>
        <span>${page.name}</span>
        <span style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:10px">${page.page_type}</span>
      </div>
    </div>
    <div id="prototype"></div>
  </div>
  <script>
    const tokens = ${tokensJson};
    // Simple renderer for shared view
    document.getElementById('prototype').innerHTML = renderShared(tokens);
    function renderShared(t) {
      const fields = (t.fields || []).map(f =>
        '<div style="margin-bottom:12px"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">'+f.name+'</label><input type="'+f.type+'" placeholder="Enter '+f.name.toLowerCase()+'..." style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;outline:none"/></div>'
      ).join('');
      const stats = (t.stats || []).map(s =>
        '<div style="background:white;border:1px solid #f3f4f6;border-radius:12px;padding:16px"><p style="font-size:11px;color:#9ca3af;margin:0 0 4px 0">'+s.label+'</p><p style="font-size:24px;font-weight:700;color:#111;margin:0">'+s.value+'</p></div>'
      ).join('');
      const nav = (t.navigation || []).map((n,i) =>
        '<a href="#" style="display:block;padding:8px 12px;border-radius:8px;font-size:14px;color:'+(i===0?'#15803d':'#6b7280')+';background:'+(i===0?'#f0fdf4':'transparent')+'">'+n+'</a>'
      ).join('');
      const sidebar = t.navigation?.length ? '<div style="width:220px;border-right:1px solid #f3f4f6;padding:16px;flex-shrink:0"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:12px;padding:0 12px">Menu</div>'+nav+'</div>' : '';
      return '<div style="display:flex;min-height:calc(100vh - 45px)">' + sidebar + '<div style="flex:1;padding:24px"><h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 20px 0">'+t.intent+'</h1>'+(stats?'<div style="display:grid;grid-template-columns:repeat('+Math.min((t.stats||[]).length,4)+',1fr);gap:16px;margin-bottom:24px">'+stats+'</div>':'')+fields+'</div></div>';
    }
  </script>
</body>
</html>`)
})

export default app
