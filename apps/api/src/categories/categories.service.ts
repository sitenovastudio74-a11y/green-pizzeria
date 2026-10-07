import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryExtra = { parentId?: string | null; isActive?: boolean };

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // Only one level of nesting: a parent cannot itself have a parent.
  private async checkParent(id: string | null, parentId: string | null | undefined) {
    if (!parentId) return;
    if (id && parentId === id) {
      throw new BadRequestException('A category cannot be inside itself');
    }
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('Parent category not found');
    if (parent.parentId) {
      throw new BadRequestException('Only one level of sub-sections is supported');
    }
    if (id) {
      const kids = await this.prisma.category.count({ where: { parentId: id } });
      if (kids > 0) {
        throw new BadRequestException('This category has sub-sections, so it cannot be placed inside another one');
      }
    }
  }

  async create(dto: CreateCategoryDto, imageUrl?: string, extra?: CategoryExtra) {
    await this.checkParent(null, extra?.parentId);
    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        imageUrl,
        parentId: extra?.parentId ?? null,
        isActive: extra?.isActive ?? true,
      },
    });
  }

  async findAllPublic() {
    // A sub-section is hidden too when its parent is hidden.
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        OR: [{ parentId: null }, { parent: { isActive: true } }],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, imageUrl?: string, extra?: CategoryExtra) {
    await this.findOne(id); // throws if not found
    if (extra && extra.parentId !== undefined) {
      await this.checkParent(id, extra.parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
        ...(imageUrl && { imageUrl }),
        ...(extra && extra.parentId !== undefined && { parentId: extra.parentId }),
        ...(extra && extra.isActive !== undefined && { isActive: extra.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // throws if not found
    return this.prisma.category.delete({ where: { id } });
  }
}