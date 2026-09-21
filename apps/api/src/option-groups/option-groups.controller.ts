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
import { OptionGroupsService } from './option-groups.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class OptionGroupsController {
  constructor(private optionGroupsService: OptionGroupsService) {}

  // ---------- OPTION GROUPS ----------

  @Get('products/:productId/option-groups')
  findGroupsByProduct(@Param('productId') productId: string) {
    return this.optionGroupsService.findGroupsByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('option-groups')
  createGroup(@Body() dto: CreateOptionGroupDto) {
    return this.optionGroupsService.createGroup(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('option-groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateOptionGroupDto) {
    return this.optionGroupsService.updateGroup(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete('option-groups/:id')
  removeGroup(@Param('id') id: string) {
    return this.optionGroupsService.removeGroup(id);
  }

  // ---------- OPTIONS ----------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('options')
  createOption(@Body() dto: CreateOptionDto) {
    return this.optionGroupsService.createOption(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('options/:id')
  updateOption(@Param('id') id: string, @Body() dto: UpdateOptionDto) {
    return this.optionGroupsService.updateOption(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete('options/:id')
  removeOption(@Param('id') id: string) {
    return this.optionGroupsService.removeOption(id);
  }
}
