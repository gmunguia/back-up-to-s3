import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import { S3Client } from "@aws-sdk/client-s3";
import { uploadFolder } from "./upload-folder";
import { logger as baseLogger } from "./logger";

export const backUpLastDay = async ({
  bucketName,
  now,
  s3Client,
  uploadLocation,
}: {
  bucketName: string;
  now: Date;
  s3Client: S3Client;
  uploadLocation: string;
}): Promise<
  | {
      tag: "success";
    }
  | { tag: "upload failed"; details: any }
> => {
  const logger = baseLogger.child({ from: "backUpLastDay" });
  logger.debug("backing up last day, from %s", now.toISOString());

  const yesterday = new Date(now.valueOf() - 24 * 60 * 60 * 1000);
  const year = yesterday.getFullYear().toString();
  const month = (yesterday.getMonth() + 1).toString().padStart(2, "0");
  const day = yesterday.getDate().toString().padStart(2, "0");

  const userFolders = await glob(`${uploadLocation}/library/*`);

  logger.debug("user folders found %s", userFolders);

  const results = await Promise.all(
    userFolders
      .map((folder) => {
        const userId = path.basename(folder);
        return {
          folderToBackUp: `${folder}/${year}/${month}/${day}`,
          key: `recent/${userId}/${year}/${month}/${day}.tgz`,
        };
      })
      // If the user took no pictures that day, the folder won't exist.
      .filter(({ folderToBackUp }) => {
        const doesFolderExist = fs.existsSync(folderToBackUp);
        if (!doesFolderExist)
          logger.debug("folder doesn't exist %s", folderToBackUp);
        return doesFolderExist;
      })
      .map(({ folderToBackUp, key }) => {
        logger.debug("uploading folder %s", folderToBackUp);

        return uploadFolder({
          s3Client,
          key,
          folderToBackUp,
          bucketName,
          ttlInSeconds: 30 * 24 * 60 * 60, // Thirty days.
          storageClass: "STANDARD",
        });
      }),
  );

  if (results.some((result) => result.tag !== "success")) {
    return {
      tag: "upload failed",
      details: results,
    };
  }

  return {
    tag: "success",
  };
};

export const backUpFifteenDaysAgo = async ({
  bucketName,
  now,
  s3Client,
  uploadLocation,
}: {
  bucketName: string;
  now: Date;
  s3Client: S3Client;
  uploadLocation: string;
}): Promise<
  | {
      tag: "success";
    }
  | { tag: "upload failed"; details: any }
> => {
  const logger = baseLogger.child({ from: "backUpFifteenDaysAgo" });

  logger.debug("backing up fifteen days ago, from %s", now.toISOString());

  const fifteenDaysAgo = new Date(now.valueOf() - 15 * 24 * 60 * 60 * 1000);
  const year = fifteenDaysAgo.getFullYear().toString();
  const month = (fifteenDaysAgo.getMonth() + 1).toString().padStart(2, "0");
  const day = fifteenDaysAgo.getDate().toString().padStart(2, "0");

  const userFolders = await glob(`${uploadLocation}/library/*`);

  logger.debug("user folders found %s", userFolders);

  const results = await Promise.all(
    userFolders
      .map((folder) => {
        const userId = path.basename(folder);
        return {
          folderToBackUp: `${folder}/${year}/${month}/${day}`,
          key: `old/${userId}/${year}/${month}/${day}.tgz`,
        };
      })
      // If the user took no pictures that day, the folder won't exist.
      .filter(({ folderToBackUp }) => {
        const doesFolderExist = fs.existsSync(folderToBackUp);
        if (!doesFolderExist)
          logger.debug("folder doesn't exist %s", folderToBackUp);
        return doesFolderExist;
      })
      .map(({ folderToBackUp, key }) => {
        logger.debug("uploading folder %s", folderToBackUp);
        return uploadFolder({
          s3Client,
          key,
          folderToBackUp,
          bucketName,
          storageClass: "DEEP_ARCHIVE",
        });
      }),
  );

  if (results.some((result) => result.tag !== "success")) {
    return {
      tag: "upload failed",
      details: results,
    };
  }

  return {
    tag: "success",
  };
};
