import "dotenv/config";
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface StoredResultFile {
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class LocalFilesService {
  private readonly directory = resolve(
    process.env["UPLOAD_DIR"] ?? "uploads",
  );

  private filePath(storageKey: string): string {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        storageKey,
      )
    ) {
      throw new NotFoundException("Fichier introuvable.");
    }

    return join(this.directory, storageKey);
  }

  async save(
    file: Express.Multer.File,
  ): Promise<StoredResultFile> {
    await mkdir(this.directory, { recursive: true });

    const storageKey = randomUUID();
    const path = this.filePath(storageKey);

    // "wx" refuse d'écraser un fichier existant.
    const handle = await open(path, "wx");

    try {
      await handle.writeFile(file.buffer);
    } catch (error) {
      await handle.close();
      await unlink(path).catch(() => undefined);
      throw error;
    }

    await handle.close();

    const originalName =
      file.originalname
        .replaceAll("\\", "/")
        .split("/")
        .pop()
        ?.replace(/[\u0000-\u001f\u007f]/g, "")
        .slice(0, 200) || "resultat";

    return {
      storageKey,
      originalName,
      mimeType: file.mimetype,
      size: file.buffer.length,
    };
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.filePath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async openForDownload(storageKey: string) {
    const path = this.filePath(storageKey);

    try {
      const handle = await open(path, "r");

      return handle.createReadStream({
        autoClose: true,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new ServiceUnavailableException(
          "Le fichier enregistré est indisponible.",
        );
      }

      throw error;
    }
  }
}