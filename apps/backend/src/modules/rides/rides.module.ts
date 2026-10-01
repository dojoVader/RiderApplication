import { Module } from '@nestjs/common';
import {RidesController} from "./rides/rides.controller";

@Module({
  controllers: [RidesController]
})
export class RidesModule {}
