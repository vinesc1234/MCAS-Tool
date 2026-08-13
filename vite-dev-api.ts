import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';

/**
 * Serves `api/analyze.ts` during `npm run dev`.
 *
 * In production Vercel runs the same file as a serverless function. This plugin
 * only exists so local development is a single command — it is never bundled
 * into the client build.
 */
export function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        try {
          // Loaded through Vite so the TypeScript is transpiled for us, and
          // re-imported per request so edits take effect without a restart.
          const mod = await server.ssrLoadModule('/api/analyze.ts');
          const handler = mod.default as (req: unknown, res: unknown) => Promise<unknown>;

          const body = await readJsonBody(req);

          // Minimal shim of the VercelResponse surface the handler uses.
          const shim = {
            setHeader: (k: string, v: string) => res.setHeader(k, v),
            status(code: number) {
              res.statusCode = code;
              return this;
            },
            json(payload: unknown) {
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify(payload));
            },
          };

          await handler({ method: req.method, headers: req.headers, body }, shim);
        } catch (err) {
          server.config.logger.error(`dev-api error: ${String(err)}`);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'Dev API error. Check the terminal.' }));
          }
        }
      });
    },
  };
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}
