import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TechnicianGuard } from "../auth/technician.guard.js";
import { RequestsModule } from "../requests/requests.module.js";
import { LocalFilesService } from "./local-files.service.js";
import { ResultsController } from "./results.controller.js";
import { ResultsService } from "./results.service.js";

@Module({
  imports: [AuthModule, RequestsModule],
  controllers: [ResultsController],
  providers: [
    ResultsService,
    LocalFilesService,
    TechnicianGuard,
  ],
})
export class ResultsModule {}