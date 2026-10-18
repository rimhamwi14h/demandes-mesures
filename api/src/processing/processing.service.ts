import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  RequestStatus,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { compareQueue } from "./queue-order.js";

const processingInclude = {
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
export class ProcessingService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getQueue() {
    const requests =
      await this.prisma.measurementRequest.findMany({
        where: {
          status: RequestStatus.PENDING,
          startedAt: null,
        },
        include: processingInclude,
      });

    return requests.sort(compareQueue);
  }

  async reorderQueue(requestIds: string[]) {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const pending =
            await tx.measurementRequest.findMany({
              where: {
                status: RequestStatus.PENDING,
                startedAt: null,
              },
              select: {
                id: true,
              },
            });

          const suppliedIds = new Set(requestIds);

          const isComplete =
            requestIds.length === pending.length &&
            suppliedIds.size === requestIds.length &&
            pending.every((request) =>
              suppliedIds.has(request.id),
            );

          if (!isComplete) {
            throw new BadRequestException(
              "Envoyez toutes les demandes en attente, une seule fois chacune. Rechargez la file.",
            );
          }

          for (const [position, id] of requestIds.entries()) {
            const changed =
              await tx.measurementRequest.updateMany({
                where: {
                  id,
                  status: RequestStatus.PENDING,
                  startedAt: null,
                },
                data: {
                  queuePosition: position,
                },
              });

            if (changed.count !== 1) {
              throw new ConflictException(
                "La file a changé. Rechargez-la.",
              );
            }
          }
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
        throw new ConflictException(
          "La file a changé pendant la modification. Rechargez-la.",
        );
      }

      throw error;
    }

    return this.getQueue();
  }

  async resetQueueOrder() {
    await this.prisma.measurementRequest.updateMany({
      where: {
        status: RequestStatus.PENDING,
      },
      data: {
        queuePosition: null,
      },
    });

    return this.getQueue();
  }

  async start(id: string) {
    const changed =
      await this.prisma.measurementRequest.updateMany({
        where: {
          id,
          status: RequestStatus.PENDING,
          startedAt: null,
        },
        data: {
          status: RequestStatus.IN_PROGRESS,
          startedAt: new Date(),
          queuePosition: null,
        },
      });

    if (changed.count !== 1) {
      await this.throwTransitionError(id);
    }

    return this.prisma.measurementRequest.findUniqueOrThrow({
      where: { id },
      include: processingInclude,
    });
  }

  async markNotMeasurable(id: string, reason: string) {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new BadRequestException(
        "Le motif est obligatoire.",
      );
    }

    const changed =
      await this.prisma.measurementRequest.updateMany({
        where: {
          id,
          status: {
            in: [
              RequestStatus.PENDING,
              RequestStatus.IN_PROGRESS,
            ],
          },
        },
        data: {
          status: RequestStatus.NOT_MEASURABLE,
          nonMeasurableReason: normalizedReason,
          queuePosition: null,
        },
      });

    if (changed.count !== 1) {
      await this.throwTransitionError(id);
    }

    return this.prisma.measurementRequest.findUniqueOrThrow({
      where: { id },
      include: processingInclude,
    });
  }

  private async throwTransitionError(
    id: string,
  ): Promise<never> {
    const request =
      await this.prisma.measurementRequest.findUnique({
        where: { id },
        select: { id: true },
      });

    if (!request) {
      throw new NotFoundException(
        "Demande introuvable.",
      );
    }

    throw new ConflictException(
      "Cette action est impossible dans l'état actuel de la demande.",
    );
  }
}