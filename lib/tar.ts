import { PassThrough } from "stream";
import tar from "tar";
import { logger } from "./logger";

export const archiveFolders = ({
  archiveBasePath,
  folders,
}: {
  archiveBasePath: string;
  folders: string[];
}) => {
  logger.debug("archiving folders %o", folders);

  return tar
    .create(
      {
        cwd: archiveBasePath,
        gzip: {
          level: 9,
        },
      },
      folders,
    )
    .pipe(new PassThrough());
};
