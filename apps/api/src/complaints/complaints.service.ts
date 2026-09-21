import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ComplaintStatus } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateComplaintDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }

    return this.prisma.complaint.create({
      data: {
        orderId: dto.orderId,
        userId,
        subject: dto.subject,
        description: dto.description,
        status: ComplaintStatus.OPEN,
      },
    });
  }

  async findMyComplaints(userId: string) {
    return this.prisma.complaint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { id: true, orderNumber: true } } },
    });
  }

  async findAllAdmin(status?: ComplaintStatus) {
    return this.prisma.complaint.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });
  }

  async findOne(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    return complaint;
  }

  async update(id: string, dto: UpdateComplaintDto) {
    await this.findOne(id);
    return this.prisma.complaint.update({
      where: { id },
      data: dto,
    });
  }
}
