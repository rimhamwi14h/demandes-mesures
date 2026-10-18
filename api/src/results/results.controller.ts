import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TechnicianGuard } from "../auth/technician.guard.js";
import { PublishResultDto } from "./dto/publish-result.dto.js";
import { ResultsService } from "./results.service.js";

@Controller("requests")
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(
    @Inject(ResultsService)
    private readonly results: ResultsService,
  ) {}

  @Post(":requestId/result")
  @UseGuards(TechnicianGuard)
  @UseInterceptors(
    FilesInterceptor("files", 5, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5,
        fields: 1,
        fieldSize: 10000,
        parts: 6,
      },
    }),
  )
  publish(
    @Req() request: AuthenticatedRequest,
    @Param("requestId") requestId: string,
    @Body(
      new ValidationPipe({
        expectedType: PublishResultDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: PublishResultDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.results.publish(
      request.user,
      requestId,
      body.comment,
      files,
    );
  }

  @Get(":requestId/result")
  findResult(
    @Req() request: AuthenticatedRequest,
    @Param("requestId") requestId: string,
  ) {
    return this.results.findForRequest(
      request.user,
      requestId,
    );
  }

  @Get(":requestId/result/files/:fileId")
  async download(
    @Req() request: AuthenticatedRequest,
    @Param("requestId") requestId: string,
    @Param("fileId") fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.results.download(
      request.user,
      requestId,
      fileId,
    );

    response.attachment(file.originalName);
    response.type("application/octet-stream");
    response.setHeader("Content-Length", file.size);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-store");

    return new StreamableFile(file.stream);
  }
}