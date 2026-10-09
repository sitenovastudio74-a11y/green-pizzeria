import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AddonGroupAdminService } from './addon-group-admin.service';
import {
  ApplyAddonGroupDto,
  CreateAddonGroupByNameDto,
  UpdateAddonGroupByNameDto,
} from './dto/addon-group-admin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('addon-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AddonGroupAdminController {
  constructor(private service: AddonGroupAdminService) {}

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Post('by-name')
  create(@Body() dto: CreateAddonGroupByNameDto) {
    return this.service.createByName(dto);
  }

  @Patch('by-name/:name')
  update(@Param('name') name: string, @Body() dto: UpdateAddonGroupByNameDto) {
    return this.service.updateByName(name, dto);
  }

  @Post('by-name/:name/apply')
  apply(@Param('name') name: string, @Body() dto: ApplyAddonGroupDto) {
    return this.service.applyByName(name, dto);
  }

  @Delete('by-name/:name/products/:productId')
  removeFromProduct(@Param('name') name: string, @Param('productId') productId: string) {
    return this.service.removeFromProduct(name, productId);
  }

  @Delete('by-name/:name')
  removeAll(@Param('name') name: string) {
    return this.service.removeByName(name);
  }
}