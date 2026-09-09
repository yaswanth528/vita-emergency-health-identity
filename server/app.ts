import cookieParser from 'cookie-parser';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { attachUser } from './auth.js';
import { getDb } from './db.js';
import { env } from './env.js';
import { errorHandler } from './errors.js';
import { authRouter } from './routes/auth.js';
import { plansRouter } from './routes/plans.js';
import { subscriptionRouter } from './routes/subscription.js';
import { webhookRouter } from './routes/webhooks.js';

/* ============================================================================
   API
   ----------------------------------------------------------------------------
   Built by a factory rather than at module scope so the test suite can stand
   up an app against a fresh in-memory database without opening a port.

   Middleware order matters in one specific way: the webhook router is mounted
   before `express.json()` so it keeps its raw body. Parsing the JSON first
   would leave the signature verifier with a re-serialised object, and the HMAC
   would fail for reasons no log line would explain.
   ========================================================================== */

function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header('origin');

  // An empty allowlist means same-origin only, which is what the Vite dev
  // proxy and a single-origin deployment both want. Credentials are involved,
  // so a wildcard is never an option here.
  if (origin && env.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    res.status(204).end();
    return;
  }

  next();
}

export function createApp(): Express {
  const app = express();

  // Behind a proxy or load balancer, so `secure` cookies and client IPs work.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  getDb();

  app.use(cors);
  app.use(cookieParser());

  // Raw body first — see the note above.
  app.use('/api/webhooks', webhookRouter);

  app.use(express.json({ limit: '100kb' }));
  app.use(attachUser);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      // Lets the UI say "payments are unavailable" honestly instead of opening
      // a checkout that cannot succeed. Neither field is a secret.
      payments: {
        configured: env.razorpay.configured,
        // Null rather than 'test' when unconfigured: with no keys there is no
        // mode, and reporting one made the UI badge a checkout as "test mode"
        // on a deployment that cannot take a payment at all.
        mode: env.razorpay.configured ? env.razorpay.mode : null,
        webhookConfigured: env.razorpay.webhookConfigured,
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/subscription', subscriptionRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'invalid_request', message: 'No such endpoint.' } });
  });

  app.use(errorHandler);

  return app;
}
