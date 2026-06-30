import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { authenticate } from '../middlewares/auth.middleware';
import { loginLimiter } from '../middlewares/rateLimiter';

const router = Router();
const authService = new AuthService();
const auditService = new AuditService();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

// Login com rate limiting + log de acesso
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const tokens = await authService.login(data);

    // Log de acesso
    const user = await authService.getProfileByEmail(data.email);
    if (user) {
      await auditService.log({
        userId: user.id,
        action: 'LOGIN',
        entity: 'Session',
        details: {
          ip: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        },
      });
    }

    // Refresh token em httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false, // mudar pra true se usar HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: '/api/auth',
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(401).json({ error: error.message || 'Credenciais inválidas' });
  }
});

// Refresh via cookie ou body (retrocompatível)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token não fornecido' });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Atualiza cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Token inválido' });
  }
});

// Logout — limpa o cookie
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logout realizado' });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
      newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(400).json({ error: error.message || 'Erro ao alterar senha' });
  }
});

export default router;
