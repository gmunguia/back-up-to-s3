import * as path from "path";
import { it, describe, before } from "mocha";
import { expect } from "expect";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { cleanEnv, str } from "envalid";

import { backUp } from "./back-up";

describe("", function () {
  // Uploads take seconds to complete.
  this.timeout(10000);

  const env = cleanEnv(process.env, {
    BUCKET_NAME: str(),
    AWS_ACCESS_KEY_ID: str(),
    AWS_SECRET_ACCESS_KEY: str(),
    AWS_SESSION_TOKEN: str(),
    AWS_REGION: str(),
  });

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

  describe("backUp", function () {
    describe("single file, 1MB", function () {
      it("uploads the file", async function () {
        const result = await backUp({
          s3Client,
          key: `test-1-mb-${testRunId}`,
          folderToBackUp: path.join(__dirname, "fixtures/single-file-1-mb"),
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
        const result = await backUp({
          s3Client,
          key: `test-10-mb-${testRunId}`,
          folderToBackUp: path.join(__dirname, "fixtures/single-file-10-mb"),
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
        const result = await backUp({
          s3Client,
          key: `test-two-files-${testRunId}`,
          folderToBackUp: path.join(__dirname, "fixtures/two-files"),
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
              Key: `test-two-files-${testRunId}`,
            }),
          ]),
        );
      });
    });
  });
});
