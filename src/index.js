#!/usr/bin/env node
const Zotero = require('zotero-lib');
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const defaultJQPath = path.join(__dirname, '../jq/openalex-to-zotero.jq');

//TODO: Create middleware
const argv = yargs
    .option('group', {
        alias: 'g',
        describe: 'zotero://-style link to a group (mandatory argument)',
        type: 'string',
        demandOption: true,
    })
    .option('transform', {
        alias: 't',
        describe: 'Chose the transformation to apply to the data. For the option jq, you need to provide a jq file if -j',
        choices: ['jq','openalexjq', 'openalexjs', 'scholarlyjq'] // Define the allowed values
    })
    .option('jq', {
        alias: 'j',
        describe: 'Provide your own jq file',
        type: 'string',
    })
    .command('$0 [files...]', 'Example script', (yargs) => {
        yargs.positional('files', {
            describe: 'One or more files',
            type: 'string',
            array: true,
        });
    })
    .help()
    .alias('help', 'h')
    .argv;


    /*
    -t jq -j myjqfile.jq
    -t openalexjq
    -t openalexjs
    -t scholarlyjq
    */
//TODO: argv.zoterojs or argv.jq needs to be present. 
// Example of accessing the arguments
console.log(`Group/collection: ${argv.group}`);
if (argv.files) {
    console.log(`Files: ${argv.files.join(', ')}`);
} else {
    console.log('No files provided');
    process.exit(1);
}

if (!fs.existsSync(argv.jq)) {
    console.log('JQ file not found');
    process.exit(1);
}

// function to get ids from zotero://-style link
function getids(newlocation) {
    const res = newlocation.match(
        /^zotero\:\/\/select\/groups\/(library|\d+)\/(items|collections)\/([A-Z01-9]+)/
    );
    let x = {};
    if (res) {
        x.key = res[3];
        x.type = res[2];
        x.group = res[1];
    } else {
        x.key = newlocation;
    }
    return x;
}

const x = getids(argv.group);
if (!x.key) {
    console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
    process.exit(1);
};
if (!x.group) {
    console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
    process.exit(1);
};
const key = x.key;
const group = x.group;
const filterfile = argv.jq;
const files = argv.files;


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
    let data;
    // handle command line arguments...
    if (argv.transform === 'jq') {
        data = await jqfilter(infile, argv.jq);
    } else if (argv.transform === 'openalexjq') {
        const filterfile = "jq/openalex-to-zotero.jq";
        data = await jqfilter(infile, filterfile);
    } else if (argv.transform === 'openalexjs') {
        data = await openalexjs(infile, filterfile);
    } else {
        // ...
    }
    await upload(infile, data);
};

async function openalexjs(infile, filterfile) {
    // TODO: Implement this
    // uses utils/openalex-to-zotero.js
}

async function jqfilter(infile, filterfile) {
    // load filterfile as json
    const filter = fs.readFileSync(filterfile, 'utf8');
    const infileObject = JSON.parse(fs.readFileSync(infile, 'utf8'));
    const data = await jq.run(filter,
        infileObject,
        { input: 'json', output: 'pretty' });
    return data;
};

async function upload(infile, data) {
    const outf = infile + ".zotero.json";
    fs.writeFileSync(outf, data);
    // TODO: This needs a collection, x.key, and zotero object
    const result = await zotero.create_item({ files: [outf] });
    fs.writeFileSync(infile + ".zotero-result.json", JSON.stringify(result));
    // if the code below fails, you can resume from here:
    // const result = JSON.parse(fs.readFileSync(infile + ".zotero-result.json", 'utf8'));
    // console.log("data: " + JSON.stringify(result, null, 4));
    const zotobject = await jq.run("[ .[] | .successful | [ to_entries[] | .value.data ] ] | flatten ", result, { input: 'json', output: 'json' });
    fs.writeFileSync(infile + ".zotero-result-filtered.json", JSON.stringify(zotobject, null, 4));
    const inob = JSON.parse(fs.readFileSync(infile, 'utf8'));
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
