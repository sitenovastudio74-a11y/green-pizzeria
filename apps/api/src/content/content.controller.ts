import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { uploadImageToCloudinary } from '../uploads/cloudinary';
import { Role } from '@prisma/client';
import { ContentService } from './content.service';
import { UpsertHomeSectionDto } from './dto/upsert-home-section.dto';
import {
  CreateStoryBlockDto,
  UpdateStoryBlockDto,
  ReorderStoryBlocksDto,
} from './dto/story-block.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const imageUploadOptions = {
  storage: memoryStorage(),
};

@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  // ----- Public -----

  @Get('home')
  findAllHomeSections() {
    return this.contentService.findAllHomeSections();
  }

  @Get('story')
  findAllStoryBlocks() {
    return this.contentService.findAllStoryBlocks();
  }

  // ----- Admin: Home sections -----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Put('home/:slot')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async upsertHomeSection(
    @Param('slot') slot: string,
    @Body() dto: UpsertHomeSectionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? await uploadImageToCloudinary(file.buffer, 'content') : undefined;
    return this.contentService.upsertHomeSection(slot, dto, imageUrl);
  }

  // ----- Admin: Story blocks -----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('story')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async createStoryBlock(
    @Body() dto: CreateStoryBlockDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? await uploadImageToCloudinary(file.buffer, 'content') : undefined;
    return this.contentService.createStoryBlock(dto, imageUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('story/:id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async updateStoryBlock(
    @Param('id') id: string,
    @Body() dto: UpdateStoryBlockDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? await uploadImageToCloudinary(file.buffer, 'content') : undefined;
    return this.contentService.updateStoryBlock(id, dto, imageUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete('story/:id')
  removeStoryBlock(@Param('id') id: string) {
    return this.contentService.removeStoryBlock(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Put('story/reorder')
  reorderStoryBlocks(@Body() dto: ReorderStoryBlocksDto) {
    return this.contentService.reorderStoryBlocks(dto);
  }
}
