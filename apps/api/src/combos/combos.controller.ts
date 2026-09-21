import {
  Controller,
  Get,
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
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const imageUploadOptions = {
  storage: memoryStorage(),
};

@Controller('combos')
export class CombosController {
  constructor(private combosService: CombosService) {}

  @Get()
  findAllPublic() {
    return this.combosService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.combosService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/all')
  findAllAdmin() {
    return this.combosService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async create(
    @Body() dto: CreateComboDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? await uploadImageToCloudinary(file.buffer, 'combos') : undefined;
    return this.combosService.create(dto, imageUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateComboDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? await uploadImageToCloudinary(file.buffer, 'combos') : undefined;
    return this.combosService.update(id, dto, imageUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.combosService.remove(id);
  }
}
