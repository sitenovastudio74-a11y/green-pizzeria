import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async signup(email: string, password: string, name: string, phone?: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    if (phone) {
      const existingPhone = await this.usersService.findByPhone(phone);
      if (existingPhone) {
        throw new ConflictException('Phone already registered');
      }
    }
    const user = await this.usersService.create(email, password, name, phone);
    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(identifier: string, password: string) {
    const isEmail = identifier.includes('@');

    const user = isEmail
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByPhone(identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.usersService.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user.id, user.email, user.role);
  }

  private async generateTokens(userId: string, email: string | null, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email: email ?? '', role },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as any,
      },
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { accessToken, refreshToken, userId };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.expiresAt < new Date() || session.revokedAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await this.usersService.verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.usersService.resetPassword(userId, newPassword);
    await this.logoutAll(userId);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.setResetToken(user.id, resetToken, expiry);

    console.log('--- PASSWORD RESET LINK (dev only) ---');
    console.log('http://localhost:3002/reset-password?token=' + resetToken);
    console.log('---------------------------------------');

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.usersService.resetPassword(user.id, newPassword);
    await this.logoutAll(user.id);

    return { message: 'Password has been reset successfully.' };
  }
}
