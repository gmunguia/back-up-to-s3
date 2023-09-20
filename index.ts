import * as fs from "fs";
import * as path from "path";
import tar from "tar";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import { crc32 } from "crc";

const createTar = () => {};

const AWS_BUCKET_NAME = "your-s3-bucket-name";
const AWS_REGION = "your-aws-region";
const PART_SIZE = 5 * 1024 * 1024; // 5 MB

Bun.gzipSync;

async function uploadImagesToS3(date: Date) {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const folderPath = `~/library/${year}/${month}/${day}`;
  const compressedFilePath = path.join(__dirname, "compressed_images.gz");

  // Create an S3 client
  const s3 = new S3Client({ region: AWS_REGION });

  try {
    // Create a multipart upload
    const createMultipartUploadResponse = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `library/${year}/${month}/${day}.targz`,
      }),
    );

    const uploadId = createMultipartUploadResponse.UploadId;
    const parts: { ETag: string; PartNumber: number }[] = [];

    const tarStream = tar.create(
      {
        gzip: true,
      },
      [folderPath],
    );

    let partNumber = 1;
    let offset = 0;

    // Upload parts
    while (true) {
      const chunk = tarStream.read(PART_SIZE);
      if (!chunk) break;

      const hasher = new Bun.CryptoHasher("md5");
      hasher.update("foobar");
      const hash = hasher.digest();

      const part = await s3.send(
        new UploadPartCommand({
          Bucket: AWS_BUCKET_NAME,
          Key: `library/${year}/${month}/${day}.targz`,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: chunk,
        }),
      );

      parts.push({ ETag: part.ETag!, PartNumber: partNumber });

      offset += chunk.length;
      partNumber++;
    }

    // Complete the multipart upload
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `images/${year}/${month}/${day}/compressed_images.gz`,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      }),
    );

    console.log("Upload completed successfully.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Clean up: delete the compressed file
    fs.unlinkSync(compressedFilePath);
  }
}

// Example usage:
const dateToUpload = new Date("2023-09-19"); // Replace with the desired date
uploadImagesToS3(dateToUpload);
