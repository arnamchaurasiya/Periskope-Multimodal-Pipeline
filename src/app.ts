/**
 * Periskope Multimodal Pipeline Prototype Server
 * Main application entrypoint mounting API routes and Interactive Dashboard
 */

import * as http from 'node:http';
import { ApiRouter } from './server/api-routes.ts';
import { renderDashboardHtml } from './server/static-ui.ts';

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4321;

export function createServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // 1. Health check endpoint
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'UP',
          service: 'periskope-multimodal-pipeline',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          uptimeSeconds: Math.round(process.uptime()),
          zeroDiskGuarantee: true,
          memoryUsage: process.memoryUsage(),
        })
      );
      return;
    }

    // 2. Serve Interactive Frontend Dashboard
    if ((url.pathname === '/' || url.pathname === '/dashboard') && req.method === 'GET') {
      const html = renderDashboardHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // 3. Delegate to REST API Router (/v1/...)
    const handled = await ApiRouter.handleRequest(req, res, url);
    if (handled) return;

    // 4. Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Not found: ${req.method} ${url.pathname}` }));
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`🚀 PERISKOPE MULTIMODAL INTELLIGENCE PIPELINE RUNNING`);
    console.log(`   Interactive Dashboard: http://localhost:${PORT}`);
    console.log(`   API Endpoint Base:     http://localhost:${PORT}/v1`);
    console.log(`   Health Status:         http://localhost:${PORT}/health`);
    console.log(`   Hosted MCP Server:     http://localhost:${PORT}/v1/mcp/tools`);
    console.log(`================================================================\n`);
  });
}
