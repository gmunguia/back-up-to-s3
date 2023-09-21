import { createHash, Hash } from "node:crypto";
import { PassThrough, Readable, Transform } from "stream";
import { glob } from "glob";
import tar from "tar";
import {
  CompleteMultipartUploadCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const PART_SIZE = 5 * 1024 * 1024; // 5 MB

export async function upload({
  foldersToIncludeInArchive,
  archiveBasePath,
  bucket,
  key,
  s3Client,
  ttl,
}: {
  foldersToIncludeInArchive: string[];
  archiveBasePath: string;
  bucket: string;
  key: string;
  s3Client: S3Client;
  /** TTL in seconds */
  ttl?: number;
}) {
  // The alternative to creating the tar twice is using https://www.npmjs.com/package/cloneable-readable, but I don't want another dependency. I don't care too much about performance anyway because this script runs once a day.
  const bodyStream = tar
    .create(
      {
        cwd: archiveBasePath,
        gzip: {
          level: 9,
        },
      },
      foldersToIncludeInArchive,
    )
    .pipe(new PassThrough());

  const checksumStream = tar
    .create(
      {
        cwd: archiveBasePath,
        gzip: {
          level: 9,
        },
      },
      foldersToIncludeInArchive,
    )
    .pipe(new PassThrough());

  const uploading = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: bodyStream,
      ChecksumAlgorithm: "SHA256",
      ...(ttl && { Expires: new Date(Date.now() + ttl * 1000) }),
    },
    partSize: PART_SIZE,
    leavePartsOnError: true,
  });

  const output =
    // There's no tag to identify the type of `output`. We assume success and throw otherwise.
    (await uploading.done()) as CompleteMultipartUploadCommandOutput;

  if (output.ChecksumSHA256 == null) {
    throw new Error("upload failed");
  }

  if (output.ChecksumSHA256 !== (await calculateChecksum(checksumStream))) {
    throw new Error("checksum did not validate");
  }

  return output.ChecksumSHA256;
}

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

class ChecksumCalculator extends Transform {
  constructor() {
    super();
  }

  _transform(
    chunk: Buffer,
    // Ignoring encoding because we only work with Buffer.
    _encoding: unknown,
    callback: () => void,
  ) {
    this.push(createHash("sha256").update(chunk).digest());
    callback();
  }

  _flush(callback: () => void) {
    callback();
  }
}

// See https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html?icmpid=docs_amazons3_console#large-object-checksums.
// At some point, the SDK may do this automatically. See https://github.com/aws/aws-sdk-js-v3/issues/2673
const calculateChecksum = async (stream: Readable) => {
  const checksumsOfParts: Buffer[] = await stream
    .pipe(new StreamChunker(PART_SIZE))
    .pipe(new ChecksumCalculator())
    .toArray();

  if (checksumsOfParts.length === 1) {
    return checksumsOfParts[0].toString("base64");
  }

  const checksumOfChecksums = checksumsOfParts
    .reduce(
      (hash: Hash, next: Buffer) => hash.update(next),
      createHash("sha256"),
    )
    .digest("base64");

  return `${checksumOfChecksums}-${checksumsOfParts.length}`;
};

export const backup = async ({
  bucket,
  s3Client,
  assetsFolderPath,
  date,
  ttl,
}: {
  bucket: string;
  s3Client: S3Client;
  assetsFolderPath: string;
  date: Date;
  ttl?: number;
}) => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  const key = `backups/${year}/${month}/${date}.tgz`;

  await upload({
    archiveBasePath: assetsFolderPath,
    bucket,
    foldersToIncludeInArchive: await glob(
      `${assetsFolderPath}/*/${year}/${month}/${day}`,
    ),
    key,
    s3Client,
    ttl,
  });

  return key;
};
