import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  @Get()
  findAll(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.addressesService.findAllForUser(userId);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.userId;
    return this.addressesService.findOneForUser(userId, id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateAddressDto) {
    const userId = (req as any).user.userId;
    return this.addressesService.create(userId, dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    const userId = (req as any).user.userId;
    return this.addressesService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.userId;
    return this.addressesService.remove(userId, id);
  }
}
