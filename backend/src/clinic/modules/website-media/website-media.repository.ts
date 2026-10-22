import type { Db, Filter } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { now } from "@/clinic/core/datetime";
import type {
  WebsiteMediaContentType,
  WebsiteMediaDocument,
} from "@/clinic/modules/website-media/website-media.schema";

export interface CreateWebsiteMediaInput {
  clinicId: string;
  mediaId: string;
  fileName: string;
  contentType: WebsiteMediaContentType;
  data: Buffer;
}

export class WebsiteMediaRepository {
  private constructor(private readonly db: Db, private readonly clinicId: string) {}

  static for(db: Db, clinicId: string): WebsiteMediaRepository {
    return new WebsiteMediaRepository(db, clinicId);
  }

  private get collection() {
    return this.db.collection<WebsiteMediaDocument>(CLINIC_COLLECTIONS.websiteMedia);
  }

  async create(input: CreateWebsiteMediaInput): Promise<WebsiteMediaDocument> {
    const ts = now();
    const doc: WebsiteMediaDocument = {
      _id: undefined,
      clinicId: input.clinicId,
      mediaId: input.mediaId,
      fileName: input.fileName,
      contentType: input.contentType,
      size: input.data.length,
      data: input.data as unknown as WebsiteMediaDocument["data"],
      createdAt: ts,
      updatedAt: ts,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async list(limit = 100): Promise<WebsiteMediaDocument[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    return this.collection
      .find(
        { clinicId: this.clinicId },
        {
          projection: {
            _id: 1,
            clinicId: 1,
            mediaId: 1,
            fileName: 1,
            contentType: 1,
            size: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .toArray();
  }

  async findOne(mediaId: string): Promise<WebsiteMediaDocument | null> {
    const filter: Filter<WebsiteMediaDocument> = {
      clinicId: this.clinicId,
      mediaId,
    };
    return this.collection.findOne(filter);
  }

  async deleteOne(mediaId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      clinicId: this.clinicId,
      mediaId,
    });
    return (result.deletedCount ?? 0) > 0;
  }
}

export async function getWebsiteMediaRepository(
  clinicId: string
): Promise<WebsiteMediaRepository> {
  return WebsiteMediaRepository.for(await getDb(), clinicId);
}

/** Public (unauthenticated) lookup used when serving image bytes. */
export async function findPublicWebsiteMedia(
  clinicId: string,
  mediaId: string
): Promise<WebsiteMediaDocument | null> {
  const db = await getDb();
  return db.collection<WebsiteMediaDocument>(CLINIC_COLLECTIONS.websiteMedia).findOne({
    clinicId,
    mediaId,
  });
}
