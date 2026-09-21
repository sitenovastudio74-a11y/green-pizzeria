import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  // In production the frontend (Vercel) and backend (Railway) are on
  // different domains, so the cookie must be sameSite: 'none' to be sent
  // on cross-site requests. Browsers require secure: true whenever
  // sameSite is 'none'. In local dev, everything is on localhost, so
  // 'lax' + non-secure keeps working over plain http.
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, userId } = await this.authService.signup(
      dto.email,
      dto.password,
      dto.name,
      dto.phone,
    );
    this.setTokenCookies(res, accessToken, refreshToken);
    return { userId };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, userId } = await this.authService.login(
      dto.identifier,
      dto.password,
    );
    this.setTokenCookies(res, accessToken, refreshToken);
    return { userId };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) throw new UnauthorizedException('No refresh token');

    const { accessToken, refreshToken } = await this.authService.refresh(
      oldRefreshToken,
    );
    this.setTokenCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
