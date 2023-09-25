import { build } from "esbuild";

build({
  entryPoints: ["cli.ts"],
  bundle: true,
  packages: "external",
  outfile: "cli",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
}).catch((err) => {
  process.stderr.write(err.stderr);
  process.exit(1);
});
