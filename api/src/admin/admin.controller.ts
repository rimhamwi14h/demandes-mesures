import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { TechnicianGuard } from "../auth/technician.guard.js";
import { AdminService } from "./admin.service.js";
import { CreateCompanyDto } from "./dto/create-company.dto.js";
import { AssignManagerDto } from "./dto/assign-manager.dto.js";

@Controller("admin")
@UseGuards(JwtAuthGuard, TechnicianGuard)
export class AdminController {
  constructor(
    @Inject(AdminService)
    private readonly admin: AdminService,
  ) {}

  @Get("teams")
  listTeams() {
    return this.admin.listTeams();
  }

  @Get("companies")
  listCompanies() {
    return this.admin.listCompanies();
  }

  @Post("companies")
  createCompany(
    @Body(
      new ValidationPipe({
        expectedType: CreateCompanyDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateCompanyDto,
  ) {
    return this.admin.createCompany(body);
  }

  @Put("teams/:teamId/manager")
  assignManager(
    @Param("teamId") teamId: string,
    @Body(
      new ValidationPipe({
        expectedType: AssignManagerDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: AssignManagerDto,
  ) {
    return this.admin.assignManager(teamId, body.userId);
  }
}