const uploadToZotero = (yargs) => {
    yargs
        .positional('files', {
            describe: 'One or more files',
            type: 'string',
            array: true,
        }).option('group', {
            alias: 'g',
            describe: 'zotero://-style link to a group (mandatory argument)',
            type: 'string',
            demandOption: true,
        })
        .option('transform', {
            alias: 't',
            describe: 'Chose the transformation to apply to the data. For the option jq, you need to provide a jq file if -j',
            choices: [
                'jq',
                'openalex',
                'openalexjs',
                'scholarly',
                'scopus',
                'scitejq',
            ] // Define the allowed values
        })
        .option('jq', {
            alias: 'j',
            describe: 'Provide your own jq file',
            type: 'string',
        })
        .option('tag', {
            alias: 'T',
            describe: 'Tag to add to the item',
            type: 'string',
        })
        .option('collections', {
            alias: 'c',
            describe: 'Collection to add the item to, separated with comas. ex: ABC12DEF,GHI34JKL',
            type: 'string',
        })
        .option('autocollection', {
            alias: 'C',
            describe: 'For each file provided, a new collection is created, using the file name as the collection name',
            type: 'boolean',
            default: false,
        })
        .option('autotag', {
            alias: 'A',
            describe: 'For each file provided, a new tag is created, using the file name as the tag name',
            type: 'boolean',
            default: false,
        }).option('attachoriginalmetadata', {
            alias: 'O',
            describe: 'Attach original metadata to the file',
            type: 'boolean',
            default: false,
        });
}

module.exports = { uploadToZotero }