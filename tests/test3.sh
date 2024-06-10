#!/bin/bash

for data_source in ./testdata2/*.json.gz
do
    date
    echo "Processing: $data_source"
    gzip -d "$data_source"
    unzipped_file="${data_source%.gz}"
    npm start -- db-upload "$unzipped_file"
done
