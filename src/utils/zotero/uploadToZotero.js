#!/usr/bin/env node
const Zotero = require('zotero-lib');
const jq = require('node-jq');
const fs = require('fs');
const path = require('path');
const { createAiScreening } = require('../parsing/createAiScreening');

async function zotero_upload({ infile, data, source, collectionInfo, argv }) {
    const { collections, autocollections, transform, attachoriginalmetadata } = argv;
    const zotero = new Zotero({ group_id: collectionInfo.group });
    const collectionKey = collectionInfo.key;
    const inDirectory = path.dirname(infile);
    const inFilename = path.basename(infile);
    const collectionsArray = collections?.split(',') ?? [];
    // make inDirectory + "extra_json/" if it doesn't exist:
    if (!fs.existsSync(inDirectory + "/extra_json/")) {
        fs.mkdirSync(inDirectory + "/extra_json/");
    };
    const inFileExtra = inDirectory + "/extra_json/" + inFilename;
    // Can you change references like this as follows:
    const outf = inFilename.replace(/\.json$/, '.zotero.json');
    fs.writeFileSync(outf, data);
    // TODO: This needs a collection, collectionKey, and zotero object
    let newitems = { files: [outf], collections: [collectionKey, ...collectionsArray] };
    if (autocollections) {
        newitems["newcollection"] = inFilename.replace(/\.json$/, '');
    };
    // const mytags = argv.autotags ? [infile] : [];
    const result = await zotero.create_item(newitems);
    fs.writeFileSync(inFileExtra + ".zotero-result.json", JSON.stringify(result));
    // if the code below fails, you can resume from here:
    const zotobject = await jq.run("[ .[] | .successful | [ to_entries[] | .value.data ] ] | flatten ", result, { input: 'json', output: 'json' });
    fs.writeFileSync(inFileExtra + ".zotero-result-filtered.json", JSON.stringify(zotobject, null, 4));
    // This object is what you need for the database (Table 2, deduplicated).
    // So no separate transform is needed: The correct data is already generated.
    // The only difference is the ID. I'm not sure what this ID is here... 
    const aiscreening = createAiScreening(zotobject);
    console.log("AIScreening: " + JSON.stringify(aiscreening, null, 4));
    fs.writeFileSync(inFileExtra + ".aiscreening.json", JSON.stringify(aiscreening, null, 4));
    const inob = JSON.parse(fs.readFileSync(infile, 'utf8'));
    /* Code no longer needed.
    let openalexobject;
    if (transform === 'openalexjq' || transform === 'openalexjs' || source === 'openalex') {
        openalexobject = await jq.run('.results | [ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
    } else if (transform === 'openalexjq-sdgs' || transform === 'openalexjs-sdgs') {
        openalexobject = await jq.run('[ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
    }
    let scholarlyobject;
    if (transform === 'scholarlyjq' || source === 'scholarly') {
        scholarlyobject = await jq.run('.results | [ .[] | { "key": ("GoogleScholar:" + ([ (.url_scholarbib|capture("info:(?<id>[^:]+):")), (.citedby_url|capture("cites=(?<id>[0-9]+)"))]| map(.id) | join(":"))), "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".scholarly-object.json", JSON.stringify(scholarlyobject, null, 4));
    }
    let scopusobject;
    if (transform === 'scopusjq' || source === 'scopus') {
        scopusobject = await jq.run('.results | [ .[] | { "key": ."dc:identifier", "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".scopus-object.json", JSON.stringify(scopusobject, null, 4));
    }
    let sciteobject;
    if (transform === 'scitejq' || source === 'scite') {
        sciteobject = await jq.run('.results | [ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".scite-object.json", JSON.stringify(sciteobject, null, 4));
    }
    */
    const tempdir = "temp";
    if (!fs.existsSync(tempdir)) {
        fs.mkdirSync(tempdir);
    };
    if (attachoriginalmetadata) {
        // TODO: This option will not work if other sources are used. The code needs to be changed to allow attachment of metadata from any source.
        if (source != 'openalex') {
            console.log("Attachment of original metadata only works with openalex source.");
            process.exit(1);
        };
        for (s of zotobject) {
            console.log("Upload: " + s.key);
            show(s);
            if (s.callNumber != "" && s.callNumber.startsWith("openalex:")) {
                const oakey = s.callNumber.replace(/openalex\:\s+/g, '');
                const writefile = tempdir + "/" + oakey + ".json";
                console.log(writefile);
                fs.writeFileSync(writefile, JSON.stringify(openalexobject["https://openalex.org/" + oakey], null, 4));
                // Now attach the file to the zotero record using 'addfiles':
                await zotero.item({ key: s.key, addfiles: [writefile], addtags: ["openalex:yes"] });
            } else {
                console.log("did not find call number with oa key: " + s.key + " " + s.callNumber);
            };
        };
    };
};

function show(obj) {
    console.log(JSON.stringify(obj, null, 4));
}

module.exports = { zotero_upload }