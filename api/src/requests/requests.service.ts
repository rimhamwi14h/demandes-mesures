import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  RequestStatus,
  Role,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import type { CreateRequestDto } from "./dto/create-request.dto.js";

const requestInclude = {
  samples: {
    orderBy: {
      reference: "asc",
    },
  },
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
      teamId: true,
      companyId: true,
    },
  },
} satisfies Prisma.MeasurementRequestInclude;

@Injectable()
export class RequestsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private visibility(
    user: AuthUser,
  ): Prisma.MeasurementRequestWhereInput {
    if (user.role === Role.TECHNICIAN) {
      return {};
    }

    if (user.role === Role.TEAM_MANAGER && user.teamId) {
      return {
        OR: [
          { requesterId: user.id },
          {
            requester: {
              teamId: user.teamId,
              companyId: null,
            },
          },
        ],
      };
    }

    return {
      requesterId: user.id,
    };
  }

  create(user: AuthUser, data: CreateRequestDto) {
    if (user.role === Role.TECHNICIAN) {
      throw new ForbiddenException(
        "Les demandes sont déposées par les demandeurs.",
      );
    }

    return this.prisma.measurementRequest.create({
      data: {
        requesterId: user.id,
        measurementType: data.measurementType,
        desiredDate: new Date(
          `${data.desiredDate}T00:00:00.000Z`,
        ),
        status: RequestStatus.PENDING,
        samples: {
          create: data.samples.map((sample) => ({
            reference: sample.reference,
            description: sample.description,
          })),
        },
      },
      include: requestInclude,
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.measurementRequest.findMany({
      where: this.visibility(user),
      include: requestInclude,
      orderBy: [
        { createdAt: "desc" },
        { id: "asc" },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const request =
      await this.prisma.measurementRequest.findFirst({
        where: {
          AND: [
            { id },
            this.visibility(user),
          ],
        },
        include: requestInclude,
      });

    if (!request) {
      throw new NotFoundException(
        "Demande introuvable.",
      );
    }

    return request;
  }

  private async assertOwnedAndPending(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    id: string,
  ) {
    const request =
      await tx.measurementRequest.findFirst({
        where: {
          id,
          requesterId: user.id,
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
        },
      });

    if (!request) {
      throw new NotFoundException(
        "Demande introuvable.",
      );
    }

    if (
      request.status !== RequestStatus.PENDING ||
      request.startedAt !== null
    ) {
      throw new ConflictException(
        "Seule une demande en attente peut être modifiée ou annulée.",
      );
    }
  }

  update(
    user: AuthUser,
    id: string,
    data: CreateRequestDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertOwnedAndPending(tx, user, id);

      const changed =
        await tx.measurementRequest.updateMany({
          where: {
            id,
            requesterId: user.id,
            status: RequestStatus.PENDING,
            startedAt: null,
          },
          data: {
            measurementType: data.measurementType,
            desiredDate: new Date(
              `${data.desiredDate}T00:00:00.000Z`,
            ),
          },
        });

      if (changed.count !== 1) {
        throw new ConflictException(
          "La demande a changé d'état. Rechargez la page.",
        );
      }

      await tx.sample.deleteMany({
        where: { requestId: id },
      });

      await tx.sample.createMany({
        data: data.samples.map((sample) => ({
          requestId: id,
          reference: sample.reference,
          description: sample.description,
        })),
      });

      return tx.measurementRequest.findUniqueOrThrow({
        where: { id },
        include: requestInclude,
      });
    });
  }

  cancel(user: AuthUser, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertOwnedAndPending(tx, user, id);

      const changed =
        await tx.measurementRequest.updateMany({
          where: {
            id,
            requesterId: user.id,
            status: RequestStatus.PENDING,
            startedAt: null,
          },
          data: {
            status: RequestStatus.CANCELLED,
          },
        });

      if (changed.count !== 1) {
        throw new ConflictException(
          "La demande a changé d'état. Rechargez la page.",
        );
      }

      return tx.measurementRequest.findUniqueOrThrow({
        where: { id },
        include: requestInclude,
      });
    });
  }
}