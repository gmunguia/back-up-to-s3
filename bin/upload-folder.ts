import * as path from "node:path";
import { S3Client, StorageClass } from "@aws-sdk/client-s3";
import { program } from "commander";
import z from "zod";
import { uploadFolder } from "../lib/upload-folder";

program
  .requiredOption("--folder <path>")
  .requiredOption("--bucket <name>")
  .requiredOption("--key <key>")
  .requiredOption("--storage-class <class>")
  .option("--ttl <days>");

program.parse();

(async () => {
  const options = z
    .object({
      folder: z.string(),
      bucket: z.string(),
      key: z.string(),
      storageClass: z.nativeEnum(StorageClass),
      ttl: z.coerce.number().optional(),
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

  const result = await uploadFolder({
    s3Client,
    key: options.key,
    bucketName: options.bucket,
    folderToBackUp: path.join(process.cwd(), options.folder),
    storageClass: options.storageClass,
    ttlInSeconds: options.ttl && options.ttl * 24 * 60 * 60,
  });

  switch (result.tag) {
    case "success": {
      console.log("folder backed up successfully");
      process.exit(0);
    }
    case "upload failed": {
      console.error("upload failed");
      process.exit(1);
    }
    case "invalid checksum": {
      console.error("upload failed");
      process.exit(1);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
