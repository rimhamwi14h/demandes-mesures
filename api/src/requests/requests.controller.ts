import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { RequestsService } from "./requests.service.js";
import { CreateRequestDto } from "./dto/create-request.dto.js";

@Controller("requests")
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(
    @Inject(RequestsService)
    private readonly requests: RequestsService,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body(
      new ValidationPipe({
        expectedType: CreateRequestDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateRequestDto,
  ) {
    return this.requests.create(request.user, body);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.requests.findAll(request.user);
  }

  @Get(":id")
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.requests.findOne(request.user, id);
  }

  @Put(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        expectedType: CreateRequestDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateRequestDto,
  ) {
    return this.requests.update(request.user, id, body);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.requests.cancel(request.user, id);
  }
}