import { S3Client } from "@aws-sdk/client-s3";
import { program } from "commander";
import z from "zod";
import {
  backUpFifteenDaysAgo,
  backUpLastDay,
} from "../lib/back-up-immich-files";
import { logger } from "../lib/logger";

program
  .requiredOption("--upload-location <path>")
  .requiredOption("--bucket <name>");

program.parse();

(async () => {
  const options = z
    .object({
      uploadLocation: z.string(),
      bucket: z.string(),
    })
    .parse(program.opts());

  logger.debug("running back-up-immich-files with %o", options);

  const env = z
    .object({
      AWS_ACCESS_KEY_ID: z.string(),
      AWS_REGION: z.string(),
      AWS_SECRET_ACCESS_KEY: z.string(),
      AWS_SESSION_TOKEN: z.string().optional(),
    })
    .parse(process.env);

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      sessionToken: env.AWS_SESSION_TOKEN,
    },
    region: env.AWS_REGION,
  });

  const resultFifteenDaysAgo = await backUpFifteenDaysAgo({
    s3Client,
    bucketName: options.bucket,
    now: new Date(),
    uploadLocation: options.uploadLocation,
  });

  logger.debug("uploading fifteen days ago result %o", resultFifteenDaysAgo);

  switch (resultFifteenDaysAgo.tag) {
    case "success": {
      logger.info("last fortnigth's folders backed up successfully");
      break;
    }
    case "upload failed": {
      logger.error("upload failed");
      process.exit(1);
    }
  }

  const resultLastDay = await backUpLastDay({
    s3Client,
    bucketName: options.bucket,
    now: new Date(),
    uploadLocation: options.uploadLocation,
  });

  logger.debug("uploading last day result %o", resultLastDay);

  switch (resultLastDay.tag) {
    case "success": {
      logger.info("last day's folders backed up successfully");
      process.exit(0);
    }
    case "upload failed": {
      logger.error("upload failed");
      process.exit(1);
    }
  }
})().catch((error) => {
  logger.error(error);
  process.exit(1);
});
