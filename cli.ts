import { S3Client } from "@aws-sdk/client-s3";
import { backUp } from "./back-up";
import { getFoldersToBackUp } from "./lib/immich";

(async () => {
  const s3Client = new S3Client({
    region: "",
    credentials: {
      accessKeyId: "",
      secretAccessKey: "",
    },
  });
  const date = new Date("todo");
  const assetsFolder = "";
  const bucketName = "";

  const foldersToBackUp = await getFoldersToBackUp({
    assetsFolder,
    date,
  });

  await Promise.all(
    foldersToBackUp.map((folder) =>
      backUp({
        s3Client,
        date,
        bucketName,
        folderToBackUp: folder,
      }),
    ),
  );
})();
