import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { AdminRespondReviewDto } from './dto/admin-respond-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('You can only review orders that have been delivered');
    }

    const existing = await this.prisma.review.findUnique({ where: { orderId: dto.orderId } });
    if (existing) {
      throw new ConflictException('You have already reviewed this order');
    }

    return this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });
  }

  async findByOrder(orderId: string) {
    return this.prisma.review.findUnique({
      where: { orderId },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async adminRespond(id: string, dto: AdminRespondReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return this.prisma.review.update({
      where: { id },
      data: { adminResponse: dto.adminResponse },
    });
  }
}
