"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.test.ts
var import_mocha = require("mocha");
var import_expect = require("expect");
var import_s3rver = __toESM(require("s3rver"));
var import_client_s32 = require("@aws-sdk/client-s3");

// lib.ts
var import_tar = __toESM(require("tar"));
var import_client_s3 = require("@aws-sdk/client-s3");
var PART_SIZE = 5 * 1024 * 1024;
async function upload({
  bucket,
  folderPath,
  key,
  s3Client
}) {
  const tarStream = import_tar.default.create(
    {
      gzip: true
    },
    [folderPath]
  );
  const createMultipartUploadResponse = await s3Client.send(
    new import_client_s3.CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key
    })
  );
  const uploadId = createMultipartUploadResponse.UploadId;
  const parts = [];
  let partNumber = 1;
  while (true) {
    const chunk = tarStream.read(PART_SIZE);
    if (!chunk)
      break;
    const part = await s3Client.send(
      new import_client_s3.UploadPartCommand({
        Bucket: bucket,
        Key: key,
        PartNumber: partNumber,
        UploadId: uploadId,
        Body: chunk
      })
    );
    parts.push({ ETag: part.ETag, PartNumber: partNumber });
    partNumber++;
  }
  await s3Client.send(
    new import_client_s3.CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    })
  );
}

// index.test.ts
var path = __toESM(require("path"));
(0, import_mocha.describe)("upload", () => {
  let fakeS3Server;
  let fakeS3ServerInfo;
  (0, import_mocha.before)(async () => {
    fakeS3Server = new import_s3rver.default({
      address: "127.0.0.1",
      silent: false,
      resetOnClose: true,
      directory: path.join(__dirname, "./tmp/s3rver")
    });
    fakeS3ServerInfo = await fakeS3Server.run();
    console.log("started");
  });
  (0, import_mocha.after)(() => {
    return fakeS3Server.close();
  });
  (0, import_mocha.it)("single file, 1MB", async () => {
    console.log(fakeS3ServerInfo);
    const s3Client = new import_client_s32.S3Client({
      endpoint: `http://${fakeS3ServerInfo.address}:${fakeS3ServerInfo.port}`,
      credentials: {
        accessKeyId: "S3RVER",
        secretAccessKey: "S3RVER"
      }
    });
    console.log(
      "10",
      await s3Client.send(
        new import_client_s32.CreateBucketCommand({
          Bucket: "test"
        })
      )
    );
    console.log("11");
    const foo = await s3Client.send(new import_client_s32.ListBucketsCommand({}));
    console.log("20", foo);
    await upload({
      s3Client,
      bucket: "test",
      key: "foobar",
      folderPath: path.join(__dirname, "fixtures/single-file-1-mb")
    });
    const response = await s3Client.send(
      new import_client_s32.ListObjectsV2Command({
        Bucket: "test"
      })
    );
    (0, import_expect.expect)(response.Contents).toContain({
      Key: "foo",
      ETag: "bar"
    });
  });
  import_mocha.it.skip("single file, 10MB", () => {
  });
  import_mocha.it.skip("two files", () => {
  });
});
