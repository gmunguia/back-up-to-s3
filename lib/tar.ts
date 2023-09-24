import { PassThrough } from "stream";
import tar from "tar";

export const archiveFolders = ({
  archiveBasePath,
  folders,
}: {
  archiveBasePath: string;
  folders: string[];
}) => {
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
