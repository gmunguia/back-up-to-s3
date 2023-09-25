# backup-immich-files

To install dependencies:

```bash
bun install
```

To run:

```bash
aws-vault ... -- cli --folder ...
```

To test:

```bash
export BUCKET_NAME=...
aws-vault ... -- npm run test
```

To build:

```bash
npm run bundle
```

To release:

```bash
npx release-it
```

Other:

Docker files are included because I had nowhere else to put them but I want them in Github.
