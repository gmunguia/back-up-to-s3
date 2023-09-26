import { S3Client, StorageClass } from "@aws-sdk/client-s3";
import { archiveFolders } from "./tar";
import { calculateChecksum, upload, partSizeInBytes } from "./s3";
import { logger } from "./logger";

export const uploadFolder = async ({
  s3Client,
  key,
  folderToBackUp,
  bucketName,
  ttlInSeconds,
  storageClass,
}: {
  s3Client: S3Client;
  folderToBackUp: string;
  key: string;
  bucketName: string;
  ttlInSeconds?: number;
  storageClass?: StorageClass;
}): Promise<
  | {
      tag: "success";
    }
  | { tag: "upload failed" }
  | { tag: "invalid checksum" }
> => {
  logger.debug("uploading folder %s", folderToBackUp);

  const tarForUpload = archiveFolders({
    archiveBasePath: folderToBackUp,
    folders: ["."],
  });

  const uploadResult = await upload({
    body: tarForUpload,
    bucketName,
    key,
    partSizeInBytes,
    s3Client,
    ttlInSeconds,
    storageClass,
  });

  logger.debug("upload result %o", uploadResult);

  if (uploadResult.tag === "failure") {
    return {
      tag: "upload failed",
    };
  }

  // The alternative to creating the tar twice is using something like https://www.npmjs.com/package/cloneable-readable, but I don't want another dependency. I don't care too much about performance anyway because this script runs once a day.
  const tarForChecksum = archiveFolders({
    archiveBasePath: folderToBackUp,
    folders: ["."],
  });

  const calculatedChecksum = await calculateChecksum({
    partSizeInBytes,
    stream: tarForChecksum,
  });

  logger.debug("locally calculated checksum %s", calculatedChecksum);

  if (uploadResult.checksum !== calculatedChecksum) {
    logger.debug("checksums don't match");
    return {
      tag: "invalid checksum",
    };
  }

  return {
    tag: "success",
  };
};
