import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException('Setting with key ' + key + ' not found');
    }
    return setting;
  }

  // Public helper ? used internally by other modules (e.g. checkout) to read a value with a fallback default
  async getValueOrDefault(key: string, defaultValue: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  async upsert(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async remove(key: string) {
    await this.findOne(key);
    return this.prisma.setting.delete({ where: { key } });
  }
}
