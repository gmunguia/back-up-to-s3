import * as path from "path";
import { Readable } from "stream";
import { it, describe } from "mocha";
import tar from "tar";
import { expect } from "expect";
import { archiveFolders } from "./tar";

describe("tar", function () {
  const listFilesInTar = (tarFile: Readable): Promise<string[]> => {
    return new Promise((resolve) => {
      const buffer: string[] = [];

      tarFile
        .pipe(tar.list())
        .on("entry", (entry) => {
          buffer.push(entry.path);
        })
        .on("close", () => {
          resolve(buffer);
        });
    });
  };

  describe("given folder", function () {
    it("should create an archive with its contents", async function () {
      const tar = archiveFolders({
        archiveBasePath: path.join(__dirname, "../fixtures/multiple-files"),
        folders: ["."],
      });

      const filesInTar = await listFilesInTar(tar);

      expect(filesInTar).toEqual(
        expect.arrayContaining([
          "./Free_Test_Data_1MB_JPG.jpg",
          "./Free_Test_Data_10MB_MP4_1.mp4",
          "./Free_Test_Data_10MB_MP4_2.mp4",
          "./Free_Test_Data_10MB_MP4_3.mp4",
          "./Free_Test_Data_10MB_MP4_4.mp4",
        ]),
      );
    });
  });
});
