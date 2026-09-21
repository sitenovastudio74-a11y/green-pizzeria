import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByResetToken(resetToken: string) {
    return this.prisma.user.findUnique({ where: { resetToken } });
  }

  async create(email: string, password: string, name: string, phone?: string) {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    return this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: hashedPassword,
        name,
      },
    });
  }

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    return argon2.verify(hashedPassword, plainPassword);
  }

  async setResetToken(userId: string, resetToken: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { resetToken, resetTokenExpiry: expiry },
    });
  }

  async resetPassword(userId: string, newPassword: string) {
    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }
}
