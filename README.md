# backup-immich-files

To install dependencies:

```bash
npm install
```

To run:

```bash
aws-vault ... -- npx back-up-immich-files --package @gmunguia/back-up-to-s3 --help
```

To test:

```bash
export BUCKET_NAME=...
aws-vault ... -- npm run test
```

To build:

```bash
npm run build
```

To release:

```bash
aws-vault ... -- npx release-it
```

Other:

Docker files are included because I had nowhere else to put them but I want them in Github.
