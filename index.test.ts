import * as path from "path";
import { Readable } from "stream";
import { it, describe, before } from "mocha";
import tar from "tar";
import { expect } from "expect";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { backup, upload } from "./lib";

describe("", function () {
  // Uploads take seconds to complete.
  this.timeout(10000);

  const testRunId = Math.floor(Math.random() * 1000000);
  const bucketName = "test-checksums";
  let s3Client: S3Client;

  before(async function () {
    s3Client = new S3Client({});
  });

  describe("upload", function () {
    describe("single file, 1MB", function () {
      it("uploads the file", async function () {
        await upload({
          archiveBasePath: path.join(__dirname, "fixtures/single-file-1-mb"),
          bucket: bucketName,
          foldersToIncludeInArchive: [
            path.join(__dirname, "fixtures/single-file-1-mb"),
          ],
          key: `test-1-mb-${testRunId}`,
          s3Client,
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
    });

    describe("single file, 10MB", function () {
      it("uploads the file", async function () {
        await upload({
          archiveBasePath: path.join(__dirname, "fixtures/single-file-10-mb"),
          bucket: bucketName,
          foldersToIncludeInArchive: [
            path.join(__dirname, "fixtures/single-file-10-mb"),
          ],
          key: `test-10-mb-${testRunId}`,
          s3Client,
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
    });

    describe("two files", function () {
      it("uploads the files", async function () {
        await upload({
          archiveBasePath: path.join(__dirname, "fixtures/two-files"),
          bucket: bucketName,
          foldersToIncludeInArchive: [
            path.join(__dirname, "fixtures/two-files"),
          ],
          key: `test-two-files-${testRunId}`,
          s3Client,
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
  });

  describe("backup", function () {
    const listFilesInTar = (tarFile: Readable): Promise<string[]> => {
      return new Promise((resolve) => {
        const buffer: string[] = [];

        tarFile
          .pipe(tar.list())
          .on("entry", (entry) => {
            buffer.push(entry.path);
          })
          .on("close", () => {
            resolve(buffer);
          });
      });
    };

    describe("given date 2023/01/01", function () {
      it("should only back up files #1 and #3", async function () {
        const key = await backup({
          assetsFolderPath: path.join(__dirname, "fixtures/folder-hierarchy"),
          bucket: bucketName,
          date: new Date(2023, 0, 1),
          s3Client,
        });

        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );

        const filesInTar = await listFilesInTar(
          Readable.fromWeb(response.Body?.transformToWebStream()!),
        );

        expect(filesInTar).toEqual(
          expect.arrayContaining([
            // These files are from day 1.
            expect.stringMatching("file-1.csv"),
            expect.stringMatching("file-3.csv"),
          ]),
        );

        expect(filesInTar).not.toEqual(
          expect.arrayContaining([
            // This file is from day 2.
            expect.stringMatching("file-2.csv"),
          ]),
        );
      });
    });

    describe("given date 2023/01/02", function () {
      it("should only back up file #2", async function () {
        const key = await backup({
          assetsFolderPath: path.join(__dirname, "fixtures/folder-hierarchy"),
          bucket: bucketName,
          date: new Date(2023, 0, 2),
          s3Client,
          ttl: 1,
        });

        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );

        const filesInTar = await listFilesInTar(
          Readable.fromWeb(response.Body?.transformToWebStream()!),
        );

        expect(filesInTar).not.toEqual(
          expect.arrayContaining([
            // These files are from day 1.
            expect.stringMatching("file-1.csv"),
            expect.stringMatching("file-3.csv"),
          ]),
        );

        expect(filesInTar).toEqual(
          expect.arrayContaining([
            // This file is from day 2.
            expect.stringMatching("file-2.csv"),
          ]),
        );
      });
    });
  });
});
