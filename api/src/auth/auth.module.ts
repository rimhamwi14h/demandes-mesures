import "dotenv/config";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { TeamsController } from "./teams.controller.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env["JWT_SECRET"];

        if (!secret || secret.length < 32) {
          throw new Error(
            "JWT_SECRET must contain at least 32 characters.",
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: "1h",
            algorithm: "HS256" as const,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, TeamsController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}