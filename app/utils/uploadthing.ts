import "server-only";

import { StoredFileKind } from "@prisma/client";
import { UTApi } from "uploadthing/server";
import { prisma } from "./db";

export const uploadthingApi = new UTApi();

const UNATTACHED_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const UNATTACHED_FILE_BATCH_SIZE = 50;

type DeleteOwnedStoredFileResult =
  | { status: "deleted" }
  | { status: "not_found" }
  | { status: "still_referenced" }
  | { status: "provider_failed" };

type MarkStoredFileAsAttachedResult =
  | { status: "attached" }
  | { status: "not_found" }
  | { status: "failed" };

async function isStoredFileUrlReferenced({
  url,
  kind,
}: {
  url: string;
  kind: StoredFileKind;
}) {
  const activeReference =
    kind === StoredFileKind.COMPANY_LOGO
      ? await prisma.company.findFirst({
          where: { logo: url },
          select: { id: true },
        })
      : await prisma.jobSeeker.findFirst({
          where: { resume: url },
          select: { id: true },
        });

  return activeReference !== null;
}

async function deleteUploadThingFile(fileKey: string) {
  try {
    const deletion = await uploadthingApi.deleteFiles(fileKey, {
      keyType: "fileKey",
    });

    if (!deletion.success) {
      console.error("UploadThing did not confirm stored file cleanup.");
      return false;
    }

    return true;
  } catch {
    console.error("UploadThing stored file cleanup failed.");
    return false;
  }
}

export async function markOwnedStoredFileAsAttached({
  userId,
  url,
  kind,
}: {
  userId: string;
  url: string;
  kind: StoredFileKind;
}): Promise<MarkStoredFileAsAttachedResult> {
  try {
    const result = await prisma.storedFile.updateMany({
      where: {
        userId,
        url,
        kind,
        provider: "uploadthing",
      },
      data: {
        attachedAt: new Date(),
      },
    });

    return result.count > 0
      ? { status: "attached" }
      : { status: "not_found" };
  } catch {
    console.error("Stored file attachment marking failed.");
    return { status: "failed" };
  }
}

export async function deleteOwnedStoredFile({
  userId,
  url,
  kind,
}: {
  userId: string;
  url: string;
  kind: StoredFileKind;
}): Promise<DeleteOwnedStoredFileResult> {
  const storedFile = await prisma.storedFile.findFirst({
    where: {
      userId,
      url,
      kind,
      provider: "uploadthing",
    },
    select: {
      id: true,
      fileKey: true,
    },
  });

  if (!storedFile) {
    return { status: "not_found" };
  }

  if (await isStoredFileUrlReferenced({ url, kind })) {
    return { status: "still_referenced" };
  }

  await prisma.storedFile.updateMany({
    where: {
      id: storedFile.id,
      userId,
      provider: "uploadthing",
    },
    data: {
      attachedAt: null,
    },
  });

  if (!(await deleteUploadThingFile(storedFile.fileKey))) {
    return { status: "provider_failed" };
  }

  await prisma.storedFile.deleteMany({
    where: {
      id: storedFile.id,
      userId,
      provider: "uploadthing",
    },
  });

  return { status: "deleted" };
}

export async function cleanupUnattachedStoredFiles() {
  const cutoff = new Date(Date.now() - UNATTACHED_FILE_MAX_AGE_MS);
  const candidates = await prisma.storedFile.findMany({
    where: {
      provider: "uploadthing",
      attachedAt: null,
      createdAt: { lt: cutoff },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: UNATTACHED_FILE_BATCH_SIZE,
    select: {
      id: true,
    },
  });

  const result = {
    examined: candidates.length,
    deleted: 0,
    retained: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    try {
      const storedFile = await prisma.storedFile.findFirst({
        where: {
          id: candidate.id,
          provider: "uploadthing",
          attachedAt: null,
          createdAt: { lt: cutoff },
        },
        select: {
          id: true,
          fileKey: true,
          url: true,
          kind: true,
          userId: true,
        },
      });

      if (!storedFile) {
        result.retained += 1;
        continue;
      }

      if (
        await isStoredFileUrlReferenced({
          url: storedFile.url,
          kind: storedFile.kind,
        })
      ) {
        await prisma.storedFile.updateMany({
          where: {
            id: storedFile.id,
            userId: storedFile.userId,
            provider: "uploadthing",
            attachedAt: null,
          },
          data: {
            attachedAt: new Date(),
          },
        });
        result.retained += 1;
        continue;
      }

      if (!(await deleteUploadThingFile(storedFile.fileKey))) {
        result.failed += 1;
        continue;
      }

      const deletedRecord = await prisma.storedFile.deleteMany({
        where: {
          id: storedFile.id,
          provider: "uploadthing",
          attachedAt: null,
        },
      });

      if (deletedRecord.count > 0) {
        result.deleted += 1;
      } else {
        result.retained += 1;
      }
    } catch {
      console.error("Stored file cleanup item failed.");
      result.failed += 1;
    }
  }

  return result;
}
