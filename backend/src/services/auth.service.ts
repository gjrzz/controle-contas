import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AuthPayload } from '../middlewares/auth.middleware';

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async login(input: LoginInput): Promise<TokenPair> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.active) {
      throw new Error('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(input.password, user.password);
    if (!passwordValid) {
      throw new Error('Credenciais inválidas');
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  async refreshToken(token: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthPayload;

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.active) {
        throw new Error('Usuário inativo ou não encontrado');
      }

      const newPayload: AuthPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(newPayload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as string,
      } as jwt.SignOptions);

      const refreshToken = jwt.sign(newPayload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
      } as jwt.SignOptions);

      return { accessToken, refreshToken };
    } catch {
      throw new Error('Refresh token inválido');
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }
}
