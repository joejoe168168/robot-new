import { DurableObject } from 'cloudflare:workers';

const TARGET_BASE_URL = 'https://robot-sms.xyz';

const fixCors = ({ headers, status, statusText }: { headers?: HeadersInit; status?: number; statusText?: string }) => {
	const newHeaders = new Headers(headers);
	newHeaders.set('Access-Control-Allow-Origin', '*');
	return { headers: newHeaders, status, statusText };
};

const handleOPTIONS = async () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': '*',
			'Access-Control-Allow-Headers': '*',
		},
	});
};

export class WebsiteProxy extends DurableObject {
	env: Env;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return handleOPTIONS();
		}

		// Proxy all requests directly to the target website
		return this.proxyRequest(request, url);
	}

	// Main proxy method
	async proxyRequest(request: Request, url: URL): Promise<Response> {
		// Build target URL
		const targetUrl = `${TARGET_BASE_URL}${url.pathname}${url.search}`;
		console.log(`Proxying request to: ${targetUrl}`);

		try {
			// Prepare headers for the proxied request
			const proxyHeaders = new Headers();
			
			// Copy important headers from original request
			for (const [key, value] of request.headers) {
				// Skip host and origin headers to avoid conflicts
				if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
					proxyHeaders.set(key, value);
				}
			}

			// Set appropriate headers for the target site
			proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
			proxyHeaders.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
			proxyHeaders.set('Accept-Language', 'en-US,en;q=0.5');

			// Make the request to the target website
			const response = await fetch(targetUrl, {
				method: request.method,
				headers: proxyHeaders,
				body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
			});

			console.log(`Proxy response status: ${response.status}`);

			// Process the response
			return this.processProxyResponse(response, url);

		} catch (error) {
			console.error('Proxy request failed:', error);
			return new Response(`Proxy Error: ${error}`, {
				status: 502,
				headers: fixCors({ headers: { 'Content-Type': 'text/plain' } }).headers,
			});
		}
	}

	// Process the response from the target website
	private async processProxyResponse(response: Response, originalUrl: URL): Promise<Response> {
		const responseHeaders = new Headers();
		
		// Copy response headers but modify some for proxy functionality
		for (const [key, value] of response.headers) {
			const lowerKey = key.toLowerCase();
			// Skip headers that might cause issues
			if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lowerKey)) {
				responseHeaders.set(key, value);
			}
		}

		// Set CORS headers
		responseHeaders.set('Access-Control-Allow-Origin', '*');
		responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		responseHeaders.set('Access-Control-Allow-Headers', '*');

		// Handle different content types
		const contentType = response.headers.get('content-type') || '';
		
		if (contentType.includes('text/html')) {
			// For HTML, we need to rewrite URLs
			const html = await response.text();
			const modifiedHtml = this.rewriteHtmlUrls(html, originalUrl);
			return new Response(modifiedHtml, {
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
			});
		}

		// For other content types, return as-is
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		});
	}

	// Rewrite URLs in HTML content to point through the proxy
	private rewriteHtmlUrls(html: string, originalUrl: URL): string {
		const proxyBase = `${originalUrl.protocol}//${originalUrl.host}`;
		
		// Replace absolute URLs pointing to the target site
		html = html.replace(new RegExp(TARGET_BASE_URL, 'g'), proxyBase);
		
		// Replace relative URLs with absolute URLs through the proxy
		html = html.replace(/href="\/(?!\/)/g, `href="${proxyBase}/`);
		html = html.replace(/src="\/(?!\/)/g, `src="${proxyBase}/`);
		html = html.replace(/action="\/(?!\/)/g, `action="${proxyBase}/`);
		
		// Handle protocol-relative URLs
		html = html.replace(/\/\/robot-sms\.xyz/g, `//${originalUrl.host}`);
		
		return html;
	}
}