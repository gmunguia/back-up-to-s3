import { glob } from "glob";

export const getFoldersToBackUp = ({
  assetsFolder,
  date,
}: {
  assetsFolder: string;
  date: Date;
}) => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return glob(`${assetsFolder}/*/${year}/${month}/${day}`);
};
