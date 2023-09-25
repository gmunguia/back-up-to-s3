import { build } from "esbuild";

build({
  entryPoints: ["./bin/upload-folder.ts"],
  bundle: true,
  packages: "external",
  outfile: "./bin/upload-folder.js",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
}).catch((err) => {
  process.stderr.write(err.stderr);
  process.exit(1);
});

build({
  entryPoints: ["./bin/back-up-immich-files.ts"],
  bundle: true,
  packages: "external",
  outfile: "./bin/back-up-immich-files.js",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
}).catch((err) => {
  process.stderr.write(err.stderr);
  process.exit(1);
});
