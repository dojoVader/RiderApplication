import {Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards} from '@nestjs/common';
import {Request} from 'express';
import {CreateRidesRequest} from "../../dtos/requests/create-rides.request";
import {RidesService} from "./rides.service";
import {JwtGuard} from "../auth/guards/jwtauth.guard";
import {Role} from "../../generated/prisma/enums";

// Shape of the JWT payload signed in AuthService.login and set on req.user by JwtGuard.
type JwtUser = { sub: string; email: string; role: Role };

@Controller('rides')
export class RidesController {

    constructor(private readonly rideService: RidesService) {}



    @Post()
    async createRides(@Body() body: CreateRidesRequest){
        return this.rideService.createRides(body);
    }

    @Get(':id')
    @UseGuards(JwtGuard)
    async getRide(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const user = req.user as JwtUser;
        return this.rideService.findRideForUser(id, user.sub, user.role);
    }


}
