#!/bin/bash

for data_source in ./testdata2/*.json.gz
do
    date
    echo "Processing: $data_source"
    gzip -d "$data_source" -k
    unzipped_file="${data_source%.gz}"
    zotero-json-uploader db-upload "$unzipped_file"
done
