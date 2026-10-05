import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHomeSectionDto } from './dto/upsert-home-section.dto';
import {
  CreateStoryBlockDto,
  UpdateStoryBlockDto,
  ReorderStoryBlocksDto,
} from './dto/story-block.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ----- Home sections -----

  findAllHomeSections() {
    return this.prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertHomeSection(slot: string, dto: UpsertHomeSectionDto, imageUrl?: string) {
    return this.prisma.homeSection.upsert({
      where: { slot },
      create: {
        slot,
        tagline: dto.tagline,
        heading: dto.heading ?? '',
        body: dto.body ?? '',
        imageUrl,
        buttonText: dto.buttonText,
        buttonLink: dto.buttonLink,
        font: dto.font ?? 'Inter',
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        ...(dto.tagline !== undefined && { tagline: dto.tagline }),
        ...(dto.heading !== undefined && { heading: dto.heading }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.buttonText !== undefined && { buttonText: dto.buttonText }),
        ...(dto.buttonLink !== undefined && { buttonLink: dto.buttonLink }),
        ...(dto.font !== undefined && { font: dto.font }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(imageUrl && { imageUrl }),
      },
    });
  }

  // ----- Story blocks -----

  findAllStoryBlocks() {
    return this.prisma.storyBlock.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createStoryBlock(dto: CreateStoryBlockDto, imageUrl?: string) {
    return this.prisma.storyBlock.create({
      data: {
        type: dto.type as any,
        content: dto.content,
        imageUrl,
        font: dto.font ?? 'Inter',
        sortOrder: dto.sortOrder,
        linkText: dto.linkText,
        linkUrl: dto.linkUrl,
      },
    });
  }

  async updateStoryBlock(id: string, dto: UpdateStoryBlockDto, imageUrl?: string) {
    const block = await this.prisma.storyBlock.findUnique({ where: { id } });
    if (!block) {
      throw new NotFoundException('Story block not found');
    }
    return this.prisma.storyBlock.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.font !== undefined && { font: dto.font }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.linkText !== undefined && { linkText: dto.linkText }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl }),
        ...(imageUrl && { imageUrl }),
      },
    });
  }

  async removeStoryBlock(id: string) {
    const block = await this.prisma.storyBlock.findUnique({ where: { id } });
    if (!block) {
      throw new NotFoundException('Story block not found');
    }
    return this.prisma.storyBlock.delete({ where: { id } });
  }

  async reorderStoryBlocks(dto: ReorderStoryBlocksDto) {
    await Promise.all(
      dto.orderedIds.map((id, index) =>
        this.prisma.storyBlock.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findAllStoryBlocks();
  }
}
