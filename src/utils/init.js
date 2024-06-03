const { transformFileData } = require('./parsing/transformFileData');
const { zotero_upload } = require('./zotero/uploadToZotero');

async function init(argv) {
    // check if files are provided
    if (!argv.files) {
        console.log('No files provided');
        process.exit(1);
    }

    console.log(`Files: ${argv.files.join(', ')}`)
    const parsedCollectionUrl = parseCollectionLink(argv.group);
    if (!parsedCollectionUrl.key || !parsedCollectionUrl.group) {
        console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
        process.exit(1);
    };

    for (file of argv.files) {
        const { data, source } = await transformFileData({
            infile: file,
            filterfile: argv.jq,
            transform: argv.transform,
            jq: argv.jq,
            autotag: argv.autotag,
            tag: argv.tag,
        });
        await zotero_upload({
            data: JSON.stringify(data, null, 4),
            collectionInfo: parsedCollectionUrl,
            infile: file,
            source,
            argv,
        });
        console.log(`File ${file} uploaded to Zotero.`);
    };
}

// function to get ids from zotero://-style link
function parseCollectionLink(collectionLink) {
    const parse = collectionLink.match(
        /^zotero\:\/\/select\/groups\/(library|\d+)\/(items|collections)\/([A-Z01-9]+)/
    );
    if (parse) return { key: parse[3], type: parse[2], group: parse[1] };
    else return { key: collectionLink };
}

module.exports = { init };