import {applyDecorators, SetMetadata} from "@nestjs/common";

export function Roles(role: string) {
    return applyDecorators(
        SetMetadata('roles', [role])
    )
}