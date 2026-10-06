import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
  ReorderTestimonialsDto,
} from './dto/testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  private formatName(full: string): string {
    const parts = (full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Customer';
    if (parts.length === 1) return parts[0];
    return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
  }

  private async nextSortOrder(): Promise<number> {
    const agg = await this.prisma.testimonial.aggregate({ _max: { sortOrder: true } });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  findPublic() {
    return this.prisma.testimonial.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        name: true,
        rating: true,
        comment: true,
        source: true,
        photoUrl: true,
        linkUrl: true,
      },
    });
  }

  findAllAdmin() {
    return this.prisma.testimonial.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateTestimonialDto) {
    const name = dto.name.trim();
    const comment = dto.comment.trim();
    const source = dto.source.trim();
    if (!name || !comment || !source) {
      throw new BadRequestException('Name, comment and source are required');
    }
    return this.prisma.testimonial.create({
      data: {
        name,
        comment,
        rating: dto.rating,
        source,
        isVisible: dto.isVisible ?? true,
        photoUrl: dto.photoUrl ?? null,
        linkUrl: dto.linkUrl ?? null,
        sortOrder: await this.nextSortOrder(),
      },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Testimonial not found');
    }
    const data: {
      name?: string;
      comment?: string;
      rating?: number;
      source?: string;
      isVisible?: boolean;
      photoUrl?: string | null;
      linkUrl?: string | null;
    } = {};
    if (dto.name !== undefined) {
      const v = dto.name.trim();
      if (!v) throw new BadRequestException('Name cannot be empty');
      data.name = v;
    }
    if (dto.comment !== undefined) {
      const v = dto.comment.trim();
      if (!v) throw new BadRequestException('Comment cannot be empty');
      data.comment = v;
    }
    if (dto.source !== undefined) {
      const v = dto.source.trim();
      if (!v) throw new BadRequestException('Source cannot be empty');
      data.source = v;
    }
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.isVisible !== undefined) data.isVisible = dto.isVisible;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.linkUrl !== undefined) data.linkUrl = dto.linkUrl;
    return this.prisma.testimonial.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Testimonial not found');
    }
    await this.prisma.testimonial.delete({ where: { id } });
    return { success: true };
  }

  async reorder(dto: ReorderTestimonialsDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.testimonial.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { success: true };
  }

  async findImportable() {
    const imported = await this.prisma.testimonial.findMany({
      where: { reviewId: { not: null } },
      select: { reviewId: true },
    });
    const ids = imported.map((t) => t.reviewId as string);
    const reviews = await this.prisma.review.findMany({
      where: { id: { notIn: ids }, comment: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    return reviews
      .filter((r) => (r.comment || '').trim().length > 0)
      .map((r) => ({
        id: r.id,
        name: this.formatName(r.user.name),
        rating: r.rating,
        comment: (r.comment as string).trim(),
        createdAt: r.createdAt,
      }));
  }

  async importReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { user: { select: { name: true } } },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const comment = (review.comment || '').trim();
    if (!comment) {
      throw new BadRequestException('This review has no comment');
    }
    const already = await this.prisma.testimonial.findUnique({ where: { reviewId } });
    if (already) {
      throw new ConflictException('This review is already imported');
    }
    return this.prisma.testimonial.create({
      data: {
        name: this.formatName(review.user.name),
        comment,
        rating: review.rating,
        source: 'Website order',
        reviewId,
        isVisible: true,
        sortOrder: await this.nextSortOrder(),
      },
    });
  }
}