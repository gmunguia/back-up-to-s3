#!/bin/sh

for f in "/usr/upload-location/*/$(date '+%Y/%m/%d')"
do
  npx @gmunguia/upload-folder-to-s3 \
    --folder ${f} \
    --bucket ${BUCKET_NAME} \
    --key "temporary-backups/${f}.tgz" \
    --storage-class STANDARD \
    --ttl 30 \
    >/proc/1/fd/1 2>/proc/1/fd/2
done
