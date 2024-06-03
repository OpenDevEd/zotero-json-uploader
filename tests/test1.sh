#!/bin/bash
echo "Running this script from the root as\nbash tests/test1.sh"
echo "Zotero library: 2024 API Test, https://www.zotero.org/groups/5478983/2024_api_test"
apitest_scholarly="zotero://select/groups/5478983/collections/KZYITWV8"
apitest_scite="zotero://select/groups/5478983/collections/T9JC48TW"
apitest_scopus="zotero://select/groups/5478983/collections/QMNKU727"
apitest_openalex="zotero://select/groups/5478983/collections/AEYWRXKN"

case $1 in
    scholarly)
        npm start -- zotero -A -g ${apitest_scholarly} "./testdata/scholarly_10.json"
        ;;
    scite)
        npm start -- zotero -A -g ${apitest_scite} "./testdata/scite_10.json"
        ;;
    scopus)
        npm start -- zotero -A -g ${apitest_scopus} "./testdata/scopus_10.json"
        ;;
    openalex)
        npm start -- zotero -A -g ${apitest_openalex} "./testdata/openalex_10.json"
        ;;
    *)
        echo "Invalid argument. Please use one of the following: scholarly, scite, scopus, openalex."
        ;;
esac

