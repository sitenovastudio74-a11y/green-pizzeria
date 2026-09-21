import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  getProfile(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.profileService.getProfile(userId);
  }

  @Patch()
  updateProfile(@Req() req: Request, @Body() body: { name?: string; phone?: string }) {
    const userId = (req as any).user.userId;
    return this.profileService.updateProfile(userId, body);
  }
}