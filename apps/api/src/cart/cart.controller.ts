import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AddComboToCartDto } from './dto/add-combo-to-cart.dto';
import { UpdateCartComboItemDto } from './dto/update-cart-combo-item.dto';
import { UpdateCartItemAddonDto } from './dto/update-cart-item-addon.dto';

@Controller('cart')
export class CartController {
  constructor(
    private cartService: CartService,
    private jwtService: JwtService,
  ) {}

  private async resolveCart(req: Request, res: Response) {
    let userId: string | null = null;
    const accessToken = req.cookies?.accessToken;

    if (accessToken) {
      try {
        const payload = this.jwtService.verify(accessToken, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }

    // Logged-in user whose access token expired: ask the client to refresh
    // instead of silently treating them as a guest.
    if (!userId && req.cookies?.refreshToken) {
      throw new UnauthorizedException('Access token expired');
    }

    let guestToken = req.cookies?.guestToken ?? null;

    const cart = await this.cartService.getOrCreateCart(userId, guestToken);

    if (!userId && cart.guestToken && cart.guestToken !== guestToken) {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('guestToken', cart.guestToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return cart;
  }

  @Get()
  async getCart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.getCart(cart.id);
  }

  @Post('items')
  async addItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddToCartDto,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.addItem(cart.id, dto);
  }

  @Patch('items/:itemId')
  async updateItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.updateItem(cart.id, itemId, dto);
  }

  @Patch('items/:itemId/addons/:addonId')
  async updateItemAddon(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Param('addonId') addonId: string,
    @Body() dto: UpdateCartItemAddonDto,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.updateAddonQuantity(cart.id, itemId, addonId, dto.quantity);
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.removeItem(cart.id, itemId);
  }

  @Post('combo-items')
  async addComboItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddComboToCartDto,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.addComboItem(cart.id, dto);
  }

  @Patch('combo-items/:itemId')
  async updateComboItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartComboItemDto,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.updateComboItem(cart.id, itemId, dto.quantity);
  }

  @Delete('combo-items/:itemId')
  async removeComboItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.removeComboItem(cart.id, itemId);
  }
}
