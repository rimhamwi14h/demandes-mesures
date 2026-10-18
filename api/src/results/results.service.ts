import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  RequestStatus,
  Role,
} from "../generated/prisma/client.js";
import type { AuthUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RequestsService } from "../requests/requests.service.js";
import { LocalFilesService } from "./local-files.service.js";
import type { StoredResultFile } from "./local-files.service.js";

const publicResultSelect = {
  id: true,
  comment: true,
  publishedAt: true,
  requestId: true,
  request: {
    select: {
      id: true,
      status: true,
      completedAt: true,
    },
  },
  files: {
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
    },
  },
} satisfies Prisma.ResultSelect;

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(RequestsService)
    private readonly requests: RequestsService,

    @Inject(LocalFilesService)
    private readonly localFiles: LocalFilesService,
  ) {}

  async publish(
    user: AuthUser,
    requestId: string,
    comment: string,
    files: Express.Multer.File[],
  ) {
    if (user.role !== Role.TECHNICIAN) {
      throw new ForbiddenException(
        "Seul le technicien peut publier un résultat.",
      );
    }

    const normalizedComment = comment.trim();

    if (!normalizedComment) {
      throw new BadRequestException(
        "Le commentaire est obligatoire.",
      );
    }

    if (
      !files?.length ||
      files.length > 5 ||
      files.some(
        (file) =>
          file.buffer.length === 0 ||
          file.buffer.length > 10 * 1024 * 1024,
      )
    ) {
      throw new BadRequestException(
        "Déposez entre 1 et 5 fichiers non vides, de 10 Mio maximum chacun.",
      );
    }

    const request =
      await this.prisma.measurementRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          status: true,
        },
      });

    if (!request) {
      throw new NotFoundException("Demande introuvable.");
    }

    if (request.status !== RequestStatus.IN_PROGRESS) {
      throw new ConflictException(
        "La demande doit être en cours pour publier un résultat.",
      );
    }

    const storedFiles: StoredResultFile[] = [];

    try {
      for (const file of files) {
        storedFiles.push(await this.localFiles.save(file));
      }

      const publishedAt = new Date();

      return await this.prisma.$transaction(async (tx) => {
        const changed =
          await tx.measurementRequest.updateMany({
            where: {
              id: requestId,
              status: RequestStatus.IN_PROGRESS,
            },
            data: {
              status: RequestStatus.COMPLETED,
              completedAt: publishedAt,
              queuePosition: null,
            },
          });

        if (changed.count !== 1) {
          throw new ConflictException(
            "La demande a changé d'état. Rechargez-la.",
          );
        }

        return tx.result.create({
          data: {
            requestId,
            comment: normalizedComment,
            publishedAt,
            files: {
              create: storedFiles,
            },
          },
          select: publicResultSelect,
        });
      });
    } catch (error) {
      const cleanup = await Promise.allSettled(
        storedFiles.map((file) =>
          this.localFiles.remove(file.storageKey),
        ),
      );

      if (cleanup.some((item) => item.status === "rejected")) {
        this.logger.error(
          "Certains fichiers d'une publication échouée n'ont pas pu être supprimés.",
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Un résultat existe déjà pour cette demande.",
        );
      }

      throw error;
    }
  }

  async findForRequest(user: AuthUser, requestId: string) {
    await this.requests.findOne(user, requestId);

    const result = await this.prisma.result.findUnique({
      where: { requestId },
      select: publicResultSelect,
    });

    if (!result) {
      throw new NotFoundException(
        "Aucun résultat publié pour cette demande.",
      );
    }

    return result;
  }

  async download(
    user: AuthUser,
    requestId: string,
    fileId: string,
  ) {
    await this.requests.findOne(user, requestId);

    const file = await this.prisma.resultFile.findFirst({
      where: {
        id: fileId,
        result: {
          requestId,
        },
      },
    });

    if (!file) {
      throw new NotFoundException("Fichier introuvable.");
    }

    const stream = await this.localFiles.openForDownload(
      file.storageKey,
    );

    return {
      stream,
      originalName: file.originalName,
      size: file.size,
    };
  }
}