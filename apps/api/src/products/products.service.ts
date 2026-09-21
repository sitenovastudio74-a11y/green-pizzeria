import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, imageUrl?: string) {
    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        imageUrl,
      },
    });
  }

  // Public: full menu detail, nested options/addons included
  async findAllPublic() {
    return this.prisma.product.findMany({
      where: { isAvailable: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
        addons: { include: { addon: true } },
        addonGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { productAddons: { include: { addon: true } } },
        },
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        optionGroups: { include: { options: true } },
        addons: { include: { addon: true } },
        addonGroups: { include: { productAddons: { include: { addon: true } } } },
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
        addons: { include: { addon: true } },
        addonGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { productAddons: { include: { addon: true } } },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, imageUrl?: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        ...(imageUrl && { imageUrl }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
