import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from "./auth/auth.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { RequestsModule } from "./requests/requests.module.js";
import { ProcessingModule } from "./processing/processing.module.js";
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    RequestsModule,
    ProcessingModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}