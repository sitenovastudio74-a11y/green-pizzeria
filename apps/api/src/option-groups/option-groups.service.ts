import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionGroupsService {
  constructor(private prisma: PrismaService) {}

  // ---------- OPTION GROUPS ----------

  async createGroup(dto: CreateOptionGroupDto) {
    return this.prisma.optionGroup.create({
      data: {
        productId: dto.productId,
        name: dto.name,
        isRequired: dto.isRequired ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { options: true },
    });
  }

  async findGroupsByProduct(productId: string) {
    return this.prisma.optionGroup.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findOneGroup(id: string) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!group) {
      throw new NotFoundException('Option group not found');
    }
    return group;
  }

  async updateGroup(id: string, dto: UpdateOptionGroupDto) {
    await this.findOneGroup(id);
    return this.prisma.optionGroup.update({
      where: { id },
      data: dto,
      include: { options: true },
    });
  }

  async removeGroup(id: string) {
    await this.findOneGroup(id);
    return this.prisma.optionGroup.delete({ where: { id } });
  }

  // ---------- OPTIONS ----------

  async createOption(dto: CreateOptionDto) {
    return this.prisma.option.create({
      data: {
        optionGroupId: dto.optionGroupId,
        name: dto.name,
        priceModifier: dto.priceModifier ?? 0,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findOneOption(id: string) {
    const option = await this.prisma.option.findUnique({ where: { id } });
    if (!option) {
      throw new NotFoundException('Option not found');
    }
    return option;
  }

  async updateOption(id: string, dto: UpdateOptionDto) {
    await this.findOneOption(id);
    return this.prisma.option.update({ where: { id }, data: dto });
  }

  async removeOption(id: string) {
    await this.findOneOption(id);
    return this.prisma.option.delete({ where: { id } });
  }
}
