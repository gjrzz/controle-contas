import rateLimit from 'express-rate-limit';

// Rate limit para login: 5 tentativas a cada 15 minutos
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usa IP + email pra limitar por combinação
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  },
});

// Rate limit geral da API: 100 requests por minuto
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Muitas requisições. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});
