import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TechnicianGuard } from "../auth/technician.guard.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, TechnicianGuard],
})
export class AdminModule {}