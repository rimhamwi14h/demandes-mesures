import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { RequestsController } from "./requests.controller.js";
import { RequestsService } from "./requests.service.js";

@Module({
  imports: [AuthModule],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}