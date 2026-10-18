import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TechnicianGuard } from "../auth/technician.guard.js";
import { ProcessingController } from "./processing.controller.js";
import { ProcessingService } from "./processing.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ProcessingController],
  providers: [ProcessingService, TechnicianGuard],
})
export class ProcessingModule {}