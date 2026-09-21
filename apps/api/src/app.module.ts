import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OptionGroupsModule } from './option-groups/option-groups.module';
import { AddonsModule } from './addons/addons.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { SettingsModule } from './settings/settings.module';
import { DeliveryModule } from './delivery/delivery.module';
import { PaymentsModule } from './payments/payments.module';
import { AddressesModule } from './addresses/addresses.module';
import { AddonGroupsModule } from './addon-groups/addon-groups.module';
import { ProfileModule } from './profile/profile.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CombosModule } from './combos/combos.module';
import { OrderCleanupModule } from './order-cleanup/order-cleanup.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule, UsersModule, CategoriesModule, ProductsModule, OptionGroupsModule, AddonsModule, OrdersModule, CartModule, CheckoutModule, ReviewsModule, ComplaintsModule, SettingsModule, DeliveryModule, PaymentsModule, AddressesModule, AddonGroupsModule, ProfileModule, CombosModule, OrderCleanupModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

