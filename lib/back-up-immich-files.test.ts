import { Readable } from "node:stream";
import * as path from "node:path";
import { afterEach, before, describe, it } from "mocha";
import { expect } from "expect";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import z from "zod";
import tar from "tar";
import { backUpLastDay } from "./back-up-immich-files";

describe("backUpLastDay", function () {
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

  afterEach(async function () {
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: [
            { Key: "recent/user-one/2023/01/01.tgz" },
            { Key: "recent/user-one/2023/01/02.tgz" },
            { Key: "recent/user-one/2023/01/03.tgz" },
            { Key: "recent/user-two/2023/01/01.tgz" },
            { Key: "recent/user-two/2023/01/02.tgz" },
            { Key: "recent/user-two/2023/01/03.tgz" },
          ],
          Quiet: false,
        },
      }),
    );
  });

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

  describe("given date 2023/01/02", function () {
    it("should only back up files #1 and #3", async function () {
      debugger;

      await backUpLastDay({
        uploadLocation: path.join(__dirname, "../fixtures/upload-location"),
        bucketName,
        now: new Date(2023, 0, 2),
        s3Client,
      });

      const userOneResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: "recent/user-one/2023/01/01.tgz",
        }),
      );

      const userTwoResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: "recent/user-two/2023/01/01.tgz",
        }),
      );

      const filesInUserOneTar = await listFilesInTar(
        Readable.fromWeb(userOneResponse.Body?.transformToWebStream() as any),
      );

      const filesInUserTwoTar = await listFilesInTar(
        Readable.fromWeb(userTwoResponse.Body?.transformToWebStream() as any),
      );

      expect(filesInUserOneTar).toEqual(
        expect.arrayContaining([
          // This file is from day 1.
          expect.stringMatching("file-1.csv"),
        ]),
      );

      expect(filesInUserOneTar).not.toEqual(
        expect.arrayContaining([
          // This file is from day 2.
          expect.stringMatching("file-2.csv"),
        ]),
      );

      expect(filesInUserTwoTar).toEqual(
        expect.arrayContaining([
          // This file is from day 1.
          expect.stringMatching("file-3.csv"),
        ]),
      );
    });
  });

  describe("given date 2023/01/03", function () {
    it("should only back up file #2", async function () {
      await backUpLastDay({
        uploadLocation: path.join(__dirname, "../fixtures/upload-location"),
        bucketName,
        now: new Date(2023, 0, 3),
        s3Client,
      });

      const userOneResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: "recent/user-one/2023/01/02.tgz",
        }),
      );

      const userTwoResponse = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: "recent/user-two/",
        }),
      );

      expect(userTwoResponse.Contents).toBe(undefined);

      const filesInUserOneTar = await listFilesInTar(
        Readable.fromWeb(userOneResponse.Body?.transformToWebStream() as any),
      );

      expect(filesInUserOneTar).not.toEqual(
        expect.arrayContaining([
          // This file is from day 1.
          expect.stringMatching("file-1.csv"),
        ]),
      );

      expect(filesInUserOneTar).toEqual(
        expect.arrayContaining([
          // This file is from day 2.
          expect.stringMatching("file-2.csv"),
        ]),
      );
    });
  });

  describe("given date 2023/01/04", function () {
    it("shouldn't back up anything", async function () {
      await backUpLastDay({
        uploadLocation: path.join(__dirname, "../fixtures/upload-location"),
        bucketName,
        now: new Date(2023, 0, 4),
        s3Client,
      });

      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: "recent/",
        }),
      );

      expect(response.Contents).toBe(undefined);
    });
  });
});
