# zotero-json-uploader

Convert json from openalex and scholarly to zotero json and upload to your zotero library

Also see https://github.com/OpenDevEd/openalex-cli/tree/main/jsontransform

## Installation

```bash
git clone https://github.com/OpenDevEd/zotero-json-uploader.git
cd zotero-json-uploader
npm run setup
```

## Usage

- Getting help
```bash
zotero-json-uploader --help
```

- Simple usage
```bash
zotero-json-upload -g "zotero://select/groups/your_group_id/collections/your_collection_key" -t transformation_method your_data.json
```

### Options
- -g, --group (required): The Zotero select link for the collection you want to upload to.
- -t, --transform: Choose the transformation method:
  - jq (requires -j): Apply a custom JQ filter defined in the file specified with -j.
  - openalexjq: Use the pre-defined JQ filter for OpenAlex data (located in the jq/openalex-to-zotero.jq file).
  - openalexjs: Use the JavaScript-based transformation for OpenAlex data (not yet implemented).
  - scholarlyjq: Use the pre-defined JQ filter for Scholarcy data (not yet implemented).
- -j, --jq: Path to your custom JQ file (required when using -t jq).

