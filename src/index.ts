import { Hono } from 'hono';
import { WebsiteProxy } from './handler';

const app = new Hono<{ Bindings: Env }>();

// All requests forwarded directly to Durable Object (no authentication needed)
app.all('*', async (c) => {
    const id: DurableObjectId = c.env.WEBSITE_PROXY.idFromName('proxy');
    const stub = c.env.WEBSITE_PROXY.get(id, { locationHint: 'wnam' });
    const resp = await stub.fetch(c.req.raw);
    return new Response(resp.body, {
        status: resp.status,
        headers: resp.headers,
    });
});

type Env = {
    WEBSITE_PROXY: DurableObjectNamespace<WebsiteProxy>;
};

export default {
    fetch: app.fetch,
};

export { WebsiteProxy };