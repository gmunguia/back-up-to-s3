import { it, describe, before } from "mocha";
import { expect } from "expect";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { upload } from "./lib";
import * as path from "path";

describe("upload", function () {
  // Uploads take seconds to complete.
  this.timeout(10000);

  const testRunId = Math.floor(Math.random() * 1000000);
  let s3Client: S3Client;
  const bucketName = "test-checksums";

  before(async () => {
    s3Client = new S3Client({});
  });

  it("single file, 1MB", async function () {
    await upload({
      s3Client,
      bucket: bucketName,
      key: `test-1-mb-${testRunId}`,
      folderPath: path.join(__dirname, "fixtures/single-file-1-mb"),
      ttl: 1,
    });

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

  it("single file, 10MB", async function () {
    await upload({
      s3Client,
      bucket: bucketName,
      key: `test-10-mb-${testRunId}`,
      folderPath: path.join(__dirname, "fixtures/single-file-10-mb"),
      ttl: 1,
    });

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

  it("two files", async function () {
    await upload({
      s3Client,
      bucket: bucketName,
      key: `test-two-files-${testRunId}`,
      folderPath: path.join(__dirname, "fixtures/two-files"),
      ttl: 1,
    });

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
