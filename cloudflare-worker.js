// 聴解クエスト 同期サーバー（Cloudflare Worker + KV）
// KV の変数名は SYNC にしてください。
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Sync-Key",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/ping") return json({ ok: true, service: "jlpt-sync" });
    if (url.pathname !== "/sync") return json({ error: "not found" }, 404);

    const key = request.headers.get("X-Sync-Key") || "";
    if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: "bad key" }, 401);
    if (!env.SYNC) return json({ error: "KV binding SYNC is missing" }, 500);
    const kvKey = "u:" + key;

    if (request.method === "GET") {
      const v = await env.SYNC.get(kvKey);
      return new Response(v || "{}", { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (request.method === "PUT") {
      const body = await request.text();
      if (body.length > 1500000) return json({ error: "too large" }, 413);
      try { JSON.parse(body); } catch (e) { return json({ error: "bad json" }, 400); }
      await env.SYNC.put(kvKey, body);
      return json({ ok: true });
    }
    return json({ error: "method not allowed" }, 405);
  },
};
