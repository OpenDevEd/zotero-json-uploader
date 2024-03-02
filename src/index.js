const Zotero = require('zotero-lib');
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');

// Parse command line arguments
const argv = process.argv.slice(2);
const group = argv[0];
const filterfile = argv[1];
const files = process.argv.slice(4);
// load filterfile as json
const filter = fs.readFileSync(filterfile, 'utf8')
    .replace(/DUMMY_IMPORT_COLLECTION/g, 'S9BQCLJR');

//    .replace(/\"DUMMY_IMPORT_COLLECTION\"/g, '');
// console.log(filter);

const zotero = new Zotero({ group_id: group });
// const openalex = new OpenAlex();

// console.log(files[0]);
// console.log(filter);
// show type of files
// console.log(typeof files[0]);


/**
 * async function main(infile)
 * @param {string} infile 
 * @returns {void}
 * Read a json file and run the filter against it to transform to json for zotero;
 * Upload the zotero json to zotero;
 * Attached the original json to the zotero item.
 * 
 * Issues:
 * - What happens if the zotero upload fails (or fails partially)?
 * - What happens if the file attachment fails?
 * 
 * Improvements:
 * - Proper cli
 * - Upload into specific collection, or with specific tag (this has been address via the filter settings above, but can be improved.)
 * - Proper error handling
 * - Support json from scholarcy
 * - Implmement checking for duplicates:
 * -- Download whole library, and determine which openalex ids already exist in zotero
 */
async function main(infile) {
    const outf = infile + ".zotero.json";
    const inob = JSON.parse(fs.readFileSync(infile, 'utf8'));
    const data = await jq.run(filter,
        inob,
        { input: 'json', output: 'pretty' });
    fs.writeFileSync(outf, data);
    const result = await zotero.create_item({ files: [outf] });
    fs.writeFileSync(infile + ".zotero-result.json", JSON.stringify(result));
    // if the code below fails, you can resume from here:
    // const result = JSON.parse(fs.readFileSync(infile + ".zotero-result.json", 'utf8'));
    // console.log("data: " + JSON.stringify(result, null, 4));
    const zotobject = await jq.run("[ .[] | .successful | [ to_entries[] | .value.data ] ] | flatten ", result, { input: 'json', output: 'json' });
    fs.writeFileSync(infile + ".zotero-result-filtered.json", JSON.stringify(zotobject, null, 4));
    const openalexobject = await jq.run('.results | [ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
    fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
    const tempdir = "temp";
    if (!fs.existsSync(tempdir)) {
        fs.mkdirSync(tempdir);
    };
    for (s of zotobject) {
        console.log("Upload: " + s.key);
        show(s);
        if (s.callNumber != "" && s.callNumber.startsWith("openalex:")) {
            const oakey = s.callNumber.replace(/openalex\:\s+/g, '');
            // console.log(s.key + " => " + JSON.stringify("https://openalex.org/" + oaob[oakey], null, 4));
            const writefile = tempdir + "/" + oakey + ".json";
            console.log(writefile);
            fs.writeFileSync(writefile, JSON.stringify(openalexobject["https://openalex.org/" + oakey], null, 4));
            const result = await zotero.item({ key: s.key, addfiles: [writefile], addtags: ["openalex:yes"] });
        } else {
            console.log("did not find call number with oa key: " + s.key + " " + s.callNumber);
        };
    };
};

function show(obj) {
    console.log(JSON.stringify(obj, null, 4));
}

(async () => {
    for (file of files) {
        await main(file);
    };
})();