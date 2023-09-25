import { S3Client } from "@aws-sdk/client-s3";
import { program } from "commander";
import z from "zod";
import {
  backUpFifteenDaysAgo,
  backUpLastDay,
} from "../lib/back-up-immich-files";

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

  switch (resultFifteenDaysAgo.tag) {
    case "success": {
      console.log("last fortnigth's folders backed up successfully");
      break;
    }
    case "upload failed": {
      console.error("upload failed");
      console.error(resultFifteenDaysAgo.details);
      process.exit(1);
    }
  }

  const resultLastDay = await backUpLastDay({
    s3Client,
    bucketName: options.bucket,
    now: new Date(),
    uploadLocation: options.uploadLocation,
  });

  switch (resultLastDay.tag) {
    case "success": {
      console.log("last day's folders backed up successfully");
      process.exit(0);
    }
    case "upload failed": {
      console.error("upload failed");
      console.error(resultLastDay.details);
      process.exit(1);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
