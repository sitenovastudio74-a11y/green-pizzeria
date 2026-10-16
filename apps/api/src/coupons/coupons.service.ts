import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private norm(code: string) {
    const c = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(c)) {
      throw new BadRequestException('Coupon code may contain only letters, numbers, hyphens and underscores (3 to 30 characters)');
    }
    return c;
  }

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateCouponDto) {
    const code = this.norm(dto.code);
    const exists = await this.prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new ConflictException('This coupon code already exists');
    return this.prisma.coupon.create({
      data: {
        code,
        percentOff: dto.percentOff,
        maxDiscount: dto.maxDiscount ?? null,
        minOrder: dto.minOrder ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        usageLimit: dto.usageLimit ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const cur = await this.prisma.coupon.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Coupon not found');
    const data: any = {};
    if (dto.code !== undefined) {
      const code = this.norm(dto.code);
      if (code !== cur.code) {
        const clash = await this.prisma.coupon.findUnique({ where: { code } });
        if (clash) throw new ConflictException('This coupon code already exists');
      }
      data.code = code;
    }
    if (dto.percentOff !== undefined) data.percentOff = dto.percentOff;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.minOrder !== undefined) data.minOrder = dto.minOrder;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async remove(id: string) {
    const cur = await this.prisma.coupon.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }

  // Validates a code against a subtotal and returns the discount. Used by checkout (final) and preview.
  async check(codeRaw: string, subtotal: number) {
    const code = String(codeRaw || '').trim().toUpperCase();
    const c = await this.prisma.coupon.findUnique({ where: { code } });
    if (!c || !c.isActive) throw new BadRequestException('Invalid coupon code');
    if (c.expiresAt && c.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    if (c.minOrder !== null && subtotal < Number(c.minOrder)) {
      throw new BadRequestException('A minimum order value of \u20B9' + Number(c.minOrder) + ' is required to use this coupon');
    }
    let discount = Math.round((subtotal * c.percentOff) / 100);
    if (c.maxDiscount !== null) discount = Math.min(discount, Number(c.maxDiscount));
    discount = Math.max(0, Math.min(discount, subtotal));
    return { coupon: c, code: c.code, percentOff: c.percentOff, discount };
  }

  async preview(code: string, subtotal: number) {
    const r = await this.check(code, subtotal);
    return { code: r.code, percentOff: r.percentOff, discount: r.discount };
  }

  // Called inside the checkout transaction. Atomic, so the usage limit cannot be exceeded by two orders at once.
  async redeemTx(tx: any, couponId: string, usageLimit: number | null) {
    const where: any = { id: couponId };
    if (usageLimit !== null && usageLimit !== undefined) where.usedCount = { lt: usageLimit };
    const r = await tx.coupon.updateMany({ where, data: { usedCount: { increment: 1 } } });
    if (r.count === 0) throw new BadRequestException('This coupon has reached its usage limit');
  }
}
