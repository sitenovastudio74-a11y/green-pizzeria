import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const name = typeof data.name === 'string' ? data.name.trim() : undefined;
    const phone = typeof data.phone === 'string' ? data.phone.trim() : undefined;

    if (name === undefined && phone === undefined) {
      throw new BadRequestException('Provide at least name or phone to update.');
    }
    if (name !== undefined && name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters.');
    }
    if (phone !== undefined && phone.length > 0 && !/^[0-9+\-\s]{7,15}$/.test(phone)) {
      throw new BadRequestException('Please enter a valid phone number.');
    }

    const updateData: { name?: string; phone?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }
}