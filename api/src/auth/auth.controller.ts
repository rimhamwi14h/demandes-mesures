import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import type { AuthenticatedRequest } from "./auth.types.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly auth: AuthService,
  ) {}

  @Post("login")
  @HttpCode(200)
  login(
    @Body(
      new ValidationPipe({
        expectedType: LoginDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: LoginDto,
  ) {
    return this.auth.login(body.email, body.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}