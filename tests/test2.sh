#!/bin/bash
echo "Running this script from the root as\nbash tests/test2.sh"
echo "Zotero library: 2024 API Test, https://www.zotero.org/groups/5478983/2024_api_test"
echo "Zotero collection group: https://www.zotero.org/groups/5478983/2024_api_test/collections/QSSECI84"

apitest_scholarly="zotero://select/groups/5478983/collections/Z365H82C"
apitest_scholarly_filled="zotero://select/groups/5478983/collections/RZVVMYDR"
apitest_scite="zotero://select/groups/5478983/collections/B9NUUNUU"
apitest_scopus="zotero://select/groups/5478983/collections/99E58YKI"
apitest_scopus_complete="zotero://select/groups/5478983/collections/I9RQBMRR"
apitest_openalex="zotero://select/groups/5478983/collections/TMIAUGYF"


npm start -- zotero -A -g ${apitest_scholarly} "./testdata/scholarly_10.json"

npm start -- zotero -A -g ${apitest_scholarly_filled} "./testdata/scholarly-filled_10.json"

npm start -- zotero -A -g ${apitest_scite} "./testdata/scite_10.json"

npm start -- zotero -A -g ${apitest_scopus} "./testdata/scopus_10.json"

npm start -- zotero -A -g ${apitest_scopus_complete} "./testdata/scopus-inst_10.json"

npm start -- zotero -A -g ${apitest_openalex} "./testdata/openalex_10.json"

