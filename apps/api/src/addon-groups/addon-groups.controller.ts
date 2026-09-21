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
import { AddonGroupsService } from './addon-groups.service';
import { CreateAddonGroupDto } from './dto/create-addon-group.dto';
import { UpdateAddonGroupDto } from './dto/update-addon-group.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class AddonGroupsController {
  constructor(private addonGroupsService: AddonGroupsService) {}

  @Get('products/:productId/addon-groups')
  findByProduct(@Param('productId') productId: string) {
    return this.addonGroupsService.findByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('addon-groups')
  create(@Body() dto: CreateAddonGroupDto) {
    return this.addonGroupsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('addon-groups/:id')
  update(@Param('id') id: string, @Body() dto: UpdateAddonGroupDto) {
    return this.addonGroupsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete('addon-groups/:id')
  remove(@Param('id') id: string) {
    return this.addonGroupsService.remove(id);
  }
}
