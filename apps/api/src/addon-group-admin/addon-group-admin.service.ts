import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplyAddonGroupDto,
  CreateAddonGroupByNameDto,
  UpdateAddonGroupByNameDto,
} from './dto/addon-group-admin.dto';

@Injectable()
export class AddonGroupAdminService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const groups = await this.prisma.addonGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { productAddons: { include: { addon: true } } },
    });
    const productIds = Array.from(new Set(groups.map((g) => g.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, categoryId: true },
    });
    const categories = await this.prisma.category.findMany({ select: { id: true, name: true } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const byName = new Map<string, typeof groups>();
    for (const g of groups) {
      const list = byName.get(g.name) || [];
      list.push(g);
      byName.set(g.name, list);
    }

    return Array.from(byName.entries()).map(([name, rows]) => {
      const addonCount = new Map<
        string,
        { addonId: string; name: string; price: string; isAvailable: boolean; productCount: number }
      >();
      for (const row of rows) {
        for (const pa of row.productAddons) {
          const existing = addonCount.get(pa.addonId);
          if (existing) {
            existing.productCount += 1;
          } else {
            addonCount.set(pa.addonId, {
              addonId: pa.addonId,
              name: pa.addon.name,
              price: String(pa.addon.price),
              isAvailable: pa.addon.isAvailable,
              productCount: 1,
            });
          }
        }
      }
      const configs = new Set(rows.map((r) => r.minSelectable + '-' + r.maxSelectable));
      return {
        name,
        minSelectable: rows[0].minSelectable,
        maxSelectable: rows[0].maxSelectable,
        mixedConfig: configs.size > 1,
        productCount: rows.length,
        addons: Array.from(addonCount.values()).sort((a, b) => b.productCount - a.productCount),
        products: rows.map((r) => {
          const p = productMap.get(r.productId);
          return {
            groupId: r.id,
            productId: r.productId,
            productName: p ? p.name : r.productId,
            categoryId: p ? p.categoryId : null,
            categoryName: p ? categoryMap.get(p.categoryId) || null : null,
          };
        }),
      };
    });
  }

  async updateByName(name: string, dto: UpdateAddonGroupByNameDto) {
    const rows = await this.prisma.addonGroup.findMany({
      where: { name },
      select: { id: true, productId: true, minSelectable: true, maxSelectable: true },
    });
    if (rows.length === 0) {
      throw new NotFoundException('Addon group not found');
    }

    const newName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (newName !== undefined && newName !== name) {
      const clash = await this.prisma.addonGroup.count({ where: { name: newName } });
      if (clash > 0) {
        throw new BadRequestException('A group named "' + newName + '" already exists');
      }
    }
    const nextMin = dto.minSelectable ?? rows[0].minSelectable;
    const nextMax = dto.maxSelectable ?? rows[0].maxSelectable;
    if (nextMin > nextMax) {
      throw new BadRequestException('Minimum cannot be more than maximum');
    }

    let addonIds: string[] | undefined;
    if (dto.addonIds !== undefined) {
      addonIds = Array.from(new Set(dto.addonIds));
      const found = await this.prisma.addon.count({ where: { id: { in: addonIds } } });
      if (found !== addonIds.length) {
        throw new BadRequestException('Some addons were not found');
      }
    }

    const ops: Prisma.PrismaPromise<any>[] = [];
    const data: { name?: string; minSelectable?: number; maxSelectable?: number } = {};
    if (newName !== undefined && newName !== name) data.name = newName;
    if (dto.minSelectable !== undefined) data.minSelectable = dto.minSelectable;
    if (dto.maxSelectable !== undefined) data.maxSelectable = dto.maxSelectable;
    if (Object.keys(data).length > 0) {
      ops.push(this.prisma.addonGroup.updateMany({ where: { name }, data }));
    }

    if (addonIds) {
      const wanted = addonIds;
      const links = await this.prisma.productAddon.findMany({
        where: { addonGroupId: { in: rows.map((r) => r.id) } },
        select: { id: true, addonId: true, addonGroupId: true },
      });
      for (const row of rows) {
        const mine = links.filter((l) => l.addonGroupId === row.id);
        const have = new Set(mine.map((l) => l.addonId));
        const removeIds = mine.filter((l) => !wanted.includes(l.addonId)).map((l) => l.id);
        const addIds = wanted.filter((id) => !have.has(id));
        if (removeIds.length > 0) {
          ops.push(this.prisma.productAddon.deleteMany({ where: { id: { in: removeIds } } }));
        }
        if (addIds.length > 0) {
          ops.push(
            this.prisma.productAddon.deleteMany({
              where: { productId: row.productId, addonId: { in: addIds } },
            }),
          );
          ops.push(
            this.prisma.productAddon.createMany({
              data: addIds.map((addonId) => ({
                productId: row.productId,
                addonId,
                addonGroupId: row.id,
              })),
            }),
          );
        }
      }
    }

    if (ops.length > 0) {
      await this.prisma.$transaction(ops);
    }
    return { success: true, products: rows.length };
  }

  async createByName(dto: CreateAddonGroupByNameDto) {
    const name = dto.name.trim();
    const min = dto.minSelectable ?? 0;
    const max = dto.maxSelectable ?? 1;
    if (min > max) {
      throw new BadRequestException('Minimum cannot be more than maximum');
    }
    const exists = await this.prisma.addonGroup.count({ where: { name } });
    if (exists > 0) {
      throw new BadRequestException('A group named "' + name + '" already exists. Use apply to add it to more items.');
    }
    const addonIds = Array.from(new Set(dto.addonIds));
    const found = await this.prisma.addon.count({ where: { id: { in: addonIds } } });
    if (found !== addonIds.length) {
      throw new BadRequestException('Some addons were not found');
    }
    const targets = await this.resolveTargets(dto);
    return this.createOnProducts({ name, min, max, sortOrder: 0, addonIds }, targets);
  }

  async applyByName(name: string, dto: ApplyAddonGroupDto) {
    const rows = await this.prisma.addonGroup.findMany({
      where: { name },
      include: { productAddons: true },
    });
    if (rows.length === 0) {
      throw new NotFoundException('Addon group not found');
    }
    const master = rows.reduce((best, r) =>
      r.productAddons.length > best.productAddons.length ? r : best,
    );
    const addonIds = Array.from(new Set(master.productAddons.map((pa) => pa.addonId)));
    const targets = await this.resolveTargets(dto);
    return this.createOnProducts(
      {
        name,
        min: master.minSelectable,
        max: master.maxSelectable,
        sortOrder: master.sortOrder,
        addonIds,
      },
      targets,
    );
  }

  async removeFromProduct(name: string, productId: string) {
    const group = await this.prisma.addonGroup.findFirst({
      where: { name, productId },
      select: { id: true },
    });
    if (!group) {
      throw new NotFoundException('This item does not have that addon group');
    }
    await this.prisma.$transaction([
      this.prisma.productAddon.deleteMany({ where: { addonGroupId: group.id } }),
      this.prisma.addonGroup.delete({ where: { id: group.id } }),
    ]);
    return { success: true };
  }

  async removeByName(name: string) {
    const rows = await this.prisma.addonGroup.findMany({ where: { name }, select: { id: true } });
    if (rows.length === 0) {
      throw new NotFoundException('Addon group not found');
    }
    const ids = rows.map((r) => r.id);
    await this.prisma.$transaction([
      this.prisma.productAddon.deleteMany({ where: { addonGroupId: { in: ids } } }),
      this.prisma.addonGroup.deleteMany({ where: { id: { in: ids } } }),
    ]);
    return { success: true, removed: ids.length };
  }

  private async resolveTargets(dto: ApplyAddonGroupDto): Promise<string[]> {
    if (dto.all) {
      const all = await this.prisma.product.findMany({ select: { id: true } });
      return all.map((p) => p.id);
    }
    const or: Prisma.ProductWhereInput[] = [];
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      or.push({ categoryId: { in: dto.categoryIds } });
    }
    if (dto.productIds && dto.productIds.length > 0) {
      or.push({ id: { in: dto.productIds } });
    }
    if (or.length === 0) {
      throw new BadRequestException('Choose all items, a category, or specific items');
    }
    const products = await this.prisma.product.findMany({
      where: { OR: or },
      select: { id: true },
    });
    return products.map((p) => p.id);
  }

  private async createOnProducts(
    cfg: { name: string; min: number; max: number; sortOrder: number; addonIds: string[] },
    productIds: string[],
  ) {
    if (productIds.length === 0) {
      return { created: 0, skipped: 0 };
    }
    const already = await this.prisma.addonGroup.findMany({
      where: { name: cfg.name, productId: { in: productIds } },
      select: { productId: true },
    });
    const skip = new Set(already.map((a) => a.productId));
    const targets = productIds.filter((id) => !skip.has(id));
    if (targets.length === 0) {
      return { created: 0, skipped: skip.size };
    }
    const groupRows = targets.map((productId) => ({
      id: randomUUID(),
      productId,
      name: cfg.name,
      minSelectable: cfg.min,
      maxSelectable: cfg.max,
      sortOrder: cfg.sortOrder,
    }));
    const linkRows = groupRows.flatMap((g) =>
      cfg.addonIds.map((addonId) => ({
        productId: g.productId,
        addonId,
        addonGroupId: g.id,
      })),
    );
    await this.prisma.$transaction([
      this.prisma.productAddon.deleteMany({
        where: { productId: { in: targets }, addonId: { in: cfg.addonIds } },
      }),
      this.prisma.addonGroup.createMany({ data: groupRows }),
      this.prisma.productAddon.createMany({ data: linkRows }),
    ]);
    return { created: targets.length, skipped: skip.size };
  }
}