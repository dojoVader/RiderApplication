import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {RidesController} from "./rides.controller";
import { RidesService } from './rides.service';
import { RidesGateway } from './rides.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  // AuthModule exports JwtModule, which JwtGuard needs along with ConfigService.
  imports: [AuthModule, ConfigModule],
  controllers: [RidesController],
  providers: [RidesService, RidesGateway]
})
export class RidesModule {}
