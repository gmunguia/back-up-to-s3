import * as fs from "fs";
import { Transform, Readable } from "stream";
import * as path from "path";
import tar from "tar";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  CompletedPart,
} from "@aws-sdk/client-s3";

// We want parts to be small so a failed part is easy to retry. Min. part size is 5MB. See https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
const PART_SIZE = 5 * 1024 * 1024; // 5 MB

class StreamChunker extends Transform {
  private leftovers: Buffer;

  constructor(private readonly chunkSize: number) {
    super();
    this.leftovers = Buffer.from([]);
  }

  _transform(
    chunk: Buffer,
    // Ignoring encoding because we only work with Buffer.
    _encoding: unknown,
    callback: () => void,
  ) {
    let data = Buffer.concat([this.leftovers, chunk]);

    while (data.length >= this.chunkSize) {
      this.push(data.subarray(0, this.chunkSize));
      data = data.subarray(this.chunkSize);
    }

    this.leftovers = data;

    callback();
  }

  _flush(callback: () => void) {
    if (this.leftovers.length > 0) this.push(this.leftovers);
    callback();
  }
}

const dateToFolderPath = ({
  basePath,
  date,
}: {
  basePath: string;
  date: Date;
}) => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${basePath}/${year}/${month}/${day}`;
};

export async function upload({
  bucket,
  folderPath,
  key,
  s3Client,
}: {
  bucket: string;
  folderPath: string;
  key: string;
  s3Client: S3Client;
}) {
  debugger;

  const tarStream = tar
    .create(
      {
        cwd: folderPath,
        gzip: true,
      },
      [folderPath],
    )
    .pipe(new StreamChunker(PART_SIZE));

  const createMultipartUploadResponse = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  const uploadId = createMultipartUploadResponse.UploadId;
  const parts: Promise<CompletedPart>[] = [];
  let partNumber = 1;

  tarStream.on("data", (chunk: Buffer) => {
    console.log("data", partNumber, chunk);

    const thisPartNumber = partNumber++;

    const part = s3Client
      .send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          PartNumber: thisPartNumber,
          UploadId: uploadId,
          Body: chunk,
        }),
      )
      .then((part) => ({
        ETag: part.ETag,
        PartNumber: thisPartNumber,
      }));

    parts.push(part);
  });

  await new Promise((resolve, reject) => {
    tarStream.on("end", resolve);
    tarStream.on("error", reject);
  });

  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: await Promise.all(parts),
      },
    }),
  );
}
