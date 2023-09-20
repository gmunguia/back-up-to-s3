import * as fs from "fs";
import * as path from "path";
import tar from "tar";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  CompletedPart,
} from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import { crc32 } from "crc";

// We want parts to be small so a failed part is easy to retry. Min. part size is 5MB. See https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
const PART_SIZE = 5 * 1024 * 1024; // 5 MB

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
  const tarStream = tar.create(
    {
      gzip: true,
    },
    [folderPath],
  );

  const createMultipartUploadResponse = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  const uploadId = createMultipartUploadResponse.UploadId;
  const parts: CompletedPart[] = [];

  let partNumber = 1;

  // Upload parts
  while (true) {
    const chunk = tarStream.read(PART_SIZE);
    if (!chunk) break;

    // const hasher = new Bun.CryptoHasher("md5");
    // hasher.update("foobar");
    // const hash = hasher.digest();

    const part = await s3Client.send(
      new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        PartNumber: partNumber,
        UploadId: uploadId,
        Body: chunk,
      }),
    );

    parts.push({ ETag: part.ETag, PartNumber: partNumber });

    partNumber++;
  }

  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    }),
  );
}
