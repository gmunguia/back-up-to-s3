import { createHash, Hash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import {
  CompleteMultipartUploadCommandOutput,
  S3Client,
  StorageClass,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const partSizeInBytes = 5 * 1024 * 1024; // 5 MB

export const getBackupKey = (date: Date) => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `backups/${year}/${month}/${day}.tgz`;
};

export const upload = async ({
  body,
  bucketName,
  key,
  partSizeInBytes,
  s3Client,
  ttlInSeconds,
  storageClass,
}: {
  body: Readable;
  bucketName: string;
  key: string;
  partSizeInBytes: number;
  s3Client: S3Client;
  ttlInSeconds?: number;
  storageClass?: StorageClass;
}): Promise<
  | {
      tag: "success";
      checksum: string;
    }
  | { tag: "failure" }
> => {
  const uploading = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: body,
      ChecksumAlgorithm: "SHA256",
      ...(ttlInSeconds && {
        Expires: new Date(Date.now() + ttlInSeconds * 1000),
      }),
      StorageClass: storageClass,
    },
    partSize: partSizeInBytes,
    leavePartsOnError: true,
  });

  const output =
    // There's no tag to identify the type of `output`. We assume success and throw otherwise.
    (await uploading.done()) as CompleteMultipartUploadCommandOutput;

  if (output.ChecksumSHA256 == null) {
    return { tag: "failure" };
  }

  return { tag: "success", checksum: output.ChecksumSHA256 };
};

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
export const calculateChecksum = async ({
  partSizeInBytes,
  stream,
}: {
  partSizeInBytes: number;
  stream: Readable;
}) => {
  const checksumsOfParts: Buffer[] = await stream
    .pipe(new StreamChunker(partSizeInBytes))
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
