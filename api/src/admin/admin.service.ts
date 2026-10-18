import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import {
  Prisma,
  Role,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateCompanyDto } from "./dto/create-company.dto.js";

@Injectable()
export class AdminService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  listTeams() {
    return this.prisma.team.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        managerId: true,
        members: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  listCompanies() {
    return this.prisma.company.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async createCompany(data: CreateCompanyDto) {
    if (Buffer.byteLength(data.password, "utf8") > 72) {
      throw new BadRequestException(
        "Le mot de passe ne doit pas dépasser 72 octets.",
      );
    }

    const passwordHash = await hash(data.password, 12);

    try {
      return await this.prisma.company.create({
        data: {
          name: data.companyName.trim(),
          contact: {
            create: {
              name: data.contactName.trim(),
              email: data.email.trim().toLowerCase(),
              passwordHash,
              role: Role.COMPANY_CONTACT,
            },
          },
        },
        select: {
          id: true,
          name: true,
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              companyId: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Cette entreprise ou cette adresse email existe déjà.",
        );
      }

      throw error;
    }
  }

  async assignManager(teamId: string, userId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const team = await tx.team.findUnique({
              where: { id: teamId },
              select: {
                id: true,
                managerId: true,
              },
            });

            if (!team) {
              throw new NotFoundException("Équipe introuvable.");
            }

            const candidate = await tx.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                teamId: true,
                companyId: true,
                role: true,
              },
            });

            if (!candidate) {
              throw new NotFoundException(
                "Utilisateur introuvable.",
              );
            }

            const isInternal =
              candidate.role === Role.REQUESTER ||
              candidate.role === Role.TEAM_MANAGER;

            if (
              !isInternal ||
              candidate.companyId !== null ||
              candidate.teamId !== team.id
            ) {
              throw new BadRequestException(
                "Le responsable doit être un membre interne de cette équipe.",
              );
            }

            // L'ancien responsable redevient demandeur.
            if (team.managerId && team.managerId !== userId) {
              await tx.user.updateMany({
                where: {
                  id: team.managerId,
                  role: Role.TEAM_MANAGER,
                },
                data: {
                  role: Role.REQUESTER,
                },
              });
            }

            await tx.user.update({
              where: { id: userId },
              data: { role: Role.TEAM_MANAGER },
            });

            return tx.team.update({
              where: { id: teamId },
              data: { managerId: userId },
              select: {
                id: true,
                name: true,
                managerId: true,
                manager: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            });
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034"
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      "Une modification concurrente a eu lieu. Réessayez.",
    );
  }
}