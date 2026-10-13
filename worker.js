/**
 * ⚡ Cloudflare Workers Edge Gateway
 * Synthesized by OmniGuild Cloud Deployer
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Instant healthcheck probe
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', runtime: 'cloudflare-edge' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('⚡ OmniGuild Edge Service Live', { status: 200 });
  }
};
