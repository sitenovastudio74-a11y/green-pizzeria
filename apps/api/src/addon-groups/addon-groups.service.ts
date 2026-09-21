import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddonGroupDto } from './dto/create-addon-group.dto';
import { UpdateAddonGroupDto } from './dto/update-addon-group.dto';

@Injectable()
export class AddonGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAddonGroupDto) {
    return this.prisma.addonGroup.create({
      data: {
        productId: dto.productId,
        name: dto.name,
        minSelectable: dto.minSelectable ?? 0,
        maxSelectable: dto.maxSelectable ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { productAddons: { include: { addon: true } } },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.addonGroup.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
      include: { productAddons: { include: { addon: true } } },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.addonGroup.findUnique({
      where: { id },
      include: { productAddons: { include: { addon: true } } },
    });
    if (!group) {
      throw new NotFoundException('Addon group not found');
    }
    return group;
  }

  async update(id: string, dto: UpdateAddonGroupDto) {
    await this.findOne(id);
    return this.prisma.addonGroup.update({
      where: { id },
      data: dto,
      include: { productAddons: { include: { addon: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.addonGroup.delete({ where: { id } });
  }
}
