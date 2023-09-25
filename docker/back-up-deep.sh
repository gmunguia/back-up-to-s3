#!/bin/sh

for f in "/usr/upload-location/*/$(date -d '-15days' '+%Y/%m/%d')"
do
  npx @gmunguia/upload-folder-to-s3 \
    --folder ${f} \
    --bucket ${BUCKET_NAME} \
    --key "backups/${f}.tgz" \
    --storage-class DEEP_ARCHIVE \
    >/proc/1/fd/1 2>/proc/1/fd/2
done
