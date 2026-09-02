import { auth } from "@/app/utils/auth";
import { prisma } from "@/app/utils/db";
import { StoredFileKind } from "@prisma/client";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { UploadedFileData } from "uploadthing/types";

const f = createUploadthing();

async function getAuthenticatedUserMetadata() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UploadThingError("Unauthorized");
  }

  return { userId: session.user.id };
}

async function storeUploadedFile({
  file,
  kind,
  userId,
}: {
  file: UploadedFileData;
  kind: StoredFileKind;
  userId: string;
}) {
  const storedFile = await prisma.storedFile.upsert({
    where: { fileKey: file.key },
    update: {
      url: file.ufsUrl,
    },
    create: {
      provider: "uploadthing",
      fileKey: file.key,
      url: file.ufsUrl,
      kind,
      userId,
    },
    select: {
      fileKey: true,
      url: true,
    },
  });

  return storedFile;
}

export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(getAuthenticatedUserMetadata)
    .onUploadComplete(async ({ metadata, file }) => {
      return storeUploadedFile({
        file,
        kind: StoredFileKind.COMPANY_LOGO,
        userId: metadata.userId,
      });
    }),

  resumeUploader: f({
    "application/pdf": {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(getAuthenticatedUserMetadata)
    .onUploadComplete(async ({ metadata, file }) => {
      return storeUploadedFile({
        file,
        kind: StoredFileKind.JOB_SEEKER_RESUME,
        userId: metadata.userId,
      });
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
