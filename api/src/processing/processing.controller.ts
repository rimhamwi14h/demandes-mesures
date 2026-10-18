import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TechnicianGuard } from "../auth/technician.guard.js";
import { ProcessingService } from "./processing.service.js";
import { ReorderQueueDto } from "./dto/reorder-queue.dto.js";
import { NotMeasurableDto } from "./dto/not-measurable.dto.js";

@Controller("processing")
@UseGuards(JwtAuthGuard, TechnicianGuard)
export class ProcessingController {
  constructor(
    @Inject(ProcessingService)
    private readonly processing: ProcessingService,
  ) {}

  @Get("queue")
  getQueue() {
    return this.processing.getQueue();
  }

  @Put("queue/order")
  reorderQueue(
    @Body(
      new ValidationPipe({
        expectedType: ReorderQueueDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: ReorderQueueDto,
  ) {
    return this.processing.reorderQueue(body.requestIds);
  }

  @Delete("queue/order")
  resetQueueOrder() {
    return this.processing.resetQueueOrder();
  }

  @Post("requests/:id/start")
  @HttpCode(200)
  start(@Param("id") id: string) {
    return this.processing.start(id);
  }

  @Post("requests/:id/not-measurable")
  @HttpCode(200)
  markNotMeasurable(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        expectedType: NotMeasurableDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: NotMeasurableDto,
  ) {
    return this.processing.markNotMeasurable(
      id,
      body.reason,
    );
  }
}