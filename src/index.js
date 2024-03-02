const Zotero = require('zotero-lib');
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');

const argv = process.argv.slice(2);
const group = argv[0];
const filterfile = argv[1];
const files = process.argv.slice(4);
// load filterfile as json
const filter = fs.readFileSync(filterfile, 'utf8');
const zotero = new Zotero({ group_id: group });
// const openalex = new OpenAlex();

// console.log(files[0]);
// console.log(filter);
// show type of files
// console.log(typeof files[0]);


/**
 * 
 * @param {string} infile 
 */
async function main(infile) {
    /** @type {string} */
    const outf = infile + ".zotero.json";
    /** @type {object} */
    const inob = JSON.parse(fs.readFileSync(infile, 'utf8'));
    /** @type {object} */
    const data = await jq.run(filter,
        inob,
        { input: 'json', output: 'pretty' });
    /** @type {void} */
    fs.writeFileSync(outf, data);
    /** @type {object} */
    const result = await zotero.create_item({ files: [outf] });
    /** @type {void} */
    fs.writeFileSync(infile + ".zotero-result.json", JSON.stringify(result));
    // const result = JSON.parse(fs.readFileSync(infile + ".zotero-result.json", 'utf8'));
    // console.log("data: " + JSON.stringify(result, null, 4));
    /** @type {object} */
    const zotobject = await jq.run(".[] | .successful | [ to_entries[] | .value.data ] ", result, { input: 'json', output: 'json' });
    /** @type {object} */
    const openalexobject = await jq.run('.results | [ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
    // console.log("data: " + JSON.stringify(data));
    const tempdir = "temp";
    // create directory if it doesn't exist
    if (!fs.existsSync(tempdir)) {
        fs.mkdirSync(tempdir);
    };
    for (s of zotobject) {
        // s.key
        const oakey = s.callNumber.replace(/openalex\:/g, '');
        // console.log(s.key + " => " + JSON.stringify("https://openalex.org/" + oaob[oakey], null, 4));
        const writefile = tempdir + "/" + oakey + ".json";
        /** @type {void} */
        fs.writeFileSync(writefile, JSON.stringify(openalexobject["https://openalex.org/" + oakey], null, 4));
        /** @type {object} */
        const result = await zotero.item({  key: s.key, addfiles: [writefile], addtags: ["openalex:yes"] });
    };

};

(async () => {
    for (file of files) {
        await main(file);
    };
})();