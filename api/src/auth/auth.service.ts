import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";

import {
  Prisma,
  Role,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { RegisterDto } from "./dto/register.dto.js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(JwtService)
    private readonly jwt: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const schoolDomain = process.env["SCHOOL_EMAIL_DOMAIN"]
      ?.trim()
      .toLowerCase();

    if (!schoolDomain) {
      throw new InternalServerErrorException(
        "Le domaine scolaire n'est pas configuré.",
      );
    }

    const email = data.email.trim().toLowerCase();
    const emailDomain = email.split("@")[1];

    if (emailDomain !== schoolDomain) {
      throw new BadRequestException(
        `Utilisez une adresse de l'école : @${schoolDomain}.`,
      );
    }

    // bcrypt utilise au maximum 72 octets.
    if (Buffer.byteLength(data.password, "utf8") > 72) {
      throw new BadRequestException(
        "Le mot de passe ne doit pas dépasser 72 octets.",
      );
    }

    const team = await this.prisma.team.findUnique({
      where: { id: data.teamId },
      select: { id: true },
    });

    if (!team) {
      throw new BadRequestException("Équipe introuvable.");
    }

    const passwordHash = await hash(data.password, 12);

    try {
      return await this.prisma.user.create({
        data: {
          name: data.name.trim(),
          email,
          passwordHash,
          role: Role.REQUESTER,
          teamId: team.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          teamId: true,
          companyId: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictException(
            "Un compte utilise déjà cette adresse email.",
          );
        }

        if (error.code === "P2003") {
          throw new BadRequestException(
            "L'équipe sélectionnée n'est plus disponible.",
          );
        }
      }

      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(
        "Email ou mot de passe incorrect.",
      );
    }

    const passwordMatches = await compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        "Email ou mot de passe incorrect.",
      );
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        companyId: user.companyId,
      },
    };
  }
}