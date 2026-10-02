import {Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, ValidationPipe} from '@nestjs/common';
import {Request} from 'express';
import {CreateRidesRequest} from "../../dtos/requests/create-rides.request";
import {PaginationRequest} from "../../dtos/requests/pagination.request";
import {UpdateRideStatusRequest} from "../../dtos/requests/update-ride-status.request";
import {RidesService} from "./rides.service";
import {RidesGateway} from "./rides.gateway";
import {NotificationService} from "../notifications/notification.service";
import {JwtGuard} from "../auth/guards/jwtauth.guard";
import {RolesGuard} from "../auth/guards/roles.guard";
import {Role} from "../../generated/prisma/enums";
import {Roles} from "../auth/decorators/role.decorators";

// Shape of the JWT payload signed in AuthService.login and set on req.user by JwtGuard.
type JwtUser = { sub: string; email: string; role: Role };

@Controller('rides')
export class RidesController {

    constructor(
        private readonly rideService: RidesService,
        private readonly ridesGateway: RidesGateway,
        private readonly notificationService: NotificationService,
    ) {}

    @Post()
    @Roles(Role.RIDER)
    @UseGuards(JwtGuard, RolesGuard)
    async createRides(@Body() body: CreateRidesRequest, @Req() req: Request){
        const user = req.user as JwtUser;
        const ride = await this.rideService.createRides(body, user.sub);
        this.ridesGateway.rideRequested(ride);
        await this.notificationService.rideRequested(ride);
        return ride;
    }

    // Declared before ':id' so these paths aren't matched as ride IDs.
    @Get('available')
    @Roles(Role.DRIVER)
    @UseGuards(JwtGuard, RolesGuard)
    async getAvailableRides() {
        return this.rideService.findAvailableRides();
    }

    // The caller's unfinished ride, or null.
    @Get('active')
    @UseGuards(JwtGuard)
    async getActiveRide(@Req() req: Request) {
        const user = req.user as JwtUser;
        return { ride: await this.rideService.findActiveRide(user.sub) };
    }

    @Get('history')
    @UseGuards(JwtGuard)
    async getRideHistory(
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: PaginationRequest,
        @Req() req: Request,
    ) {
        const user = req.user as JwtUser;
        return this.rideService.findRideHistory(user.sub, user.role, query);
    }

    @Get(':id')
    @UseGuards(JwtGuard)
    async getRide(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const user = req.user as JwtUser;
        return this.rideService.findRideForUser(id, user.sub, user.role);
    }

    @Patch(':id/accept')
    @Roles(Role.DRIVER)
    @UseGuards(JwtGuard, RolesGuard)
    async acceptRide(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const user = req.user as JwtUser;
        const ride = await this.rideService.acceptRide(id, user.sub);
        await this.ridesGateway.rideUpdated(ride);
        await this.notificationService.rideUpdated(ride, user.sub);
        return ride;
    }

    @Patch(':id/status')
    @UseGuards(JwtGuard)
    async updateRideStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: UpdateRideStatusRequest,
        @Req() req: Request,
    ) {
        const user = req.user as JwtUser;
        const ride = await this.rideService.updateRideStatus(id, user.sub, user.role, body.status);
        await this.ridesGateway.rideUpdated(ride);
        await this.notificationService.rideUpdated(ride, user.sub);
        return ride;
    }
}
