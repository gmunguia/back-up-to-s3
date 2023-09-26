import * as path from "node:path";
import { it, describe, before } from "mocha";
import { expect } from "expect";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import z from "zod";
import { uploadFolder } from "./upload-folder";

describe("upload-folder", function () {
  // Uploads take seconds to complete.
  this.timeout(10000);

  const env = z
    .object({
      AWS_ACCESS_KEY_ID: z.string(),
      AWS_REGION: z.string(),
      AWS_SECRET_ACCESS_KEY: z.string(),
      AWS_SESSION_TOKEN: z.string(),
      BUCKET_NAME: z.string(),
    })
    .parse(process.env);

  const testRunId = Math.floor(Math.random() * 1000000);
  const bucketName = env.BUCKET_NAME;
  let s3Client: S3Client;

  before(async function () {
    s3Client = new S3Client({
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN,
      },
      region: env.AWS_REGION,
    });
  });

  describe("single file, 1MB", function () {
    it("uploads the file", async function () {
      const result = await uploadFolder({
        s3Client,
        key: `test-1-mb-${testRunId}`,
        folderToBackUp: path.join(__dirname, "../fixtures/single-file-1-mb"),
        bucketName,
        ttlInSeconds: 1,
        storageClass: "STANDARD",
      });

      expect(result.tag).toBe("success");

      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
        }),
      );

      expect(response.Contents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Key: `test-1-mb-${testRunId}`,
          }),
        ]),
      );
    });
  });

  describe("single file, 10MB", function () {
    it("uploads the file", async function () {
      const result = await uploadFolder({
        s3Client,
        key: `test-10-mb-${testRunId}`,
        folderToBackUp: path.join(__dirname, "../fixtures/single-file-10-mb"),
        bucketName,
        ttlInSeconds: 1,
      });

      expect(result.tag).toBe("success");

      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
        }),
      );

      expect(response.Contents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Key: `test-10-mb-${testRunId}`,
          }),
        ]),
      );
    });
  });

  describe("two files", function () {
    it("uploads the files", async function () {
      const result = await uploadFolder({
        s3Client,
        key: `test-multiple-files-${testRunId}`,
        folderToBackUp: path.join(__dirname, "../fixtures/multiple-files"),
        bucketName,
        ttlInSeconds: 1,
      });

      expect(result.tag).toBe("success");

      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
        }),
      );

      expect(response.Contents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Key: `test-multiple-files-${testRunId}`,
          }),
        ]),
      );
    });
  });
});
