import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';

const app = express();

// Headers de segurança (XSS, clickjacking, sniffing, etc)
app.use(helmet());

// CORS restrito — só aceita do frontend configurado
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Parse cookies (para httpOnly refresh token)
app.use(cookieParser());

app.use(express.json());

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
