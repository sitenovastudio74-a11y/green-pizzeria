import { Module } from '@nestjs/common';
import { AddonGroupsService } from './addon-groups.service';
import { AddonGroupsController } from './addon-groups.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AddonGroupsService],
  controllers: [AddonGroupsController],
})
export class AddonGroupsModule {}
