import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddonDto } from './dto/create-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { LinkAddonDto } from './dto/link-addon.dto';

@Injectable()
export class AddonsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAddonDto) {
    return this.prisma.addon.create({
      data: { name: dto.name, price: dto.price },
    });
  }

  async findAll() {
    return this.prisma.addon.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const addon = await this.prisma.addon.findUnique({ where: { id } });
    if (!addon) {
      throw new NotFoundException('Addon not found');
    }
    return addon;
  }

  async update(id: string, dto: UpdateAddonDto) {
    await this.findOne(id);
    return this.prisma.addon.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.addon.delete({ where: { id } });
  }

  // ---------- Product <-> Addon linking ----------

  async linkToProduct(dto: LinkAddonDto) {
    return this.prisma.productAddon.create({
      data: {
        productId: dto.productId,
        addonId: dto.addonId,
        addonGroupId: dto.addonGroupId,
      },
      include: { addon: true },
    });
  }

  async unlinkFromProduct(productId: string, addonId: string) {
    return this.prisma.productAddon.delete({
      where: { productId_addonId: { productId, addonId } },
    });
  }
}
