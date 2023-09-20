import { it, describe, before, after } from "mocha";
import { expect } from "expect";
import FakeS3Server from "s3rver";
import {
  CreateBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { upload } from "./lib";
import * as path from "path";

describe("upload", () => {
  let fakeS3Server: FakeS3Server;
  let fakeS3ServerInfo: { address: string; port: number };

  before(async () => {
    fakeS3Server = new FakeS3Server({
      address: "127.0.0.1",
      silent: false,
      resetOnClose: true,
      directory: path.join(__dirname, "./tmp/s3rver"),
    });

    fakeS3ServerInfo = await fakeS3Server.run();

    console.log("started");
  });

  after(() => {
    return fakeS3Server.close();
  });

  it("single file, 1MB", async () => {
    console.log(fakeS3ServerInfo);

    const s3Client = new S3Client({
      endpoint: `http://${fakeS3ServerInfo.address}:${fakeS3ServerInfo.port}`,
      credentials: {
        accessKeyId: "S3RVER",
        secretAccessKey: "S3RVER",
      },
    });

    console.log(
      "10",
      await s3Client.send(
        new CreateBucketCommand({
          Bucket: "test",
        }),
      ),
    );

    console.log("11");

    const foo = await s3Client.send(new ListBucketsCommand({}));
    console.log("20", foo);

    await upload({
      s3Client,
      bucket: "test",
      key: "foobar",
      folderPath: path.join(__dirname, "fixtures/single-file-1-mb"),
    });

    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: "test",
      }),
    );

    expect(response.Contents).toContain({
      Key: "foo",
      ETag: "bar",
    });
  });

  it.skip("single file, 10MB", () => {});
  it.skip("two files", () => {});
});
