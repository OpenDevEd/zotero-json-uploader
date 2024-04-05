#!/usr/bin/env node
const Zotero = require('zotero-lib');
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const defaultPath = path.join(__dirname, '..');
// const defaultJQPath = path.join(__dirname, '../jq/openalex-to-zotero.jq');

/*
* Issues:
(1) - Collection - inspect zotero-lib: An option 'collections' should have been added to zotero.create
* - Upload into specific collection, or with specific tag (this has been address via the filter settings above, but can be improved.)
 zotero-lib create --help
usage: zotero-lib create [-h] [--template TEMPLATE] [--files [FILES ...]] [--items [ITEMS ...]] [--collections [COLLECTIONS ...]] [--newcollection NEWCOLLECTION]

optional arguments:
  -h, --help            show this help message and exit
  --template TEMPLATE   Retrieve a template for the item you wish to create. You can retrieve the template types using the main argument 'types'.
  --files [FILES ...]   Text files with JSON for the items to be created.
  --items [ITEMS ...]   JSON string(s) for the item(s) to be created.
  --collections [COLLECTIONS ...]
                        The key of the collection in which the new item is created. You can provide the key as zotero-select link (zotero://...) to also set the group-id.
  --newcollection NEWCOLLECTION
                        The title of the new collection in which the new item is created.

Test this issue and develop a test in the repo.

(2) Implemnent zoterojs

(3) 
- Support json from scholarcy
 
(4) 
 * - Proper cli (middleware)
 * - Proper error handling
 
Issues:
 * - What happens if the zotero upload fails (or fails partially)?
 * - What happens if the file attachment fails?
 * 
 */

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
        choices: ['jq','openalexjq', 'openalexjs-sdgs', 'openalexjs', 'scholarlyjq', 'openalexjq-sdgs'] // Define the allowed values
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
    .middleware((args) => {
        if (!args.transform) {
            console.log('Transformation option is missing');
            process.exit(1);
        }

        if (args.transform === 'jq' && !args.jq) {
            console.log('JQ option is missing');
            process.exit(1);
        }

        const transformOptions = ['jq','openalexjq', 'openalexjs-sdgs', 'openalexjs', 'scholarlyjq', 'openalexjq-sdgs'];
        if (!transformOptions.includes(args.transform)) {
            console.log('Transformation option is not one of the options');
            process.exit(1);
        }

        if (args.jq) {
            if (!fs.existsSync(args.jq)) {
                console.log('JQ file not found');
                process.exit(1);
            }
            // if (!fs.accessSync(args.jq, fs.constants.R_OK)) {
            //     console.log('No access to JQ file');
            //     process.exit(1);
            // }
        }
        if (args.files) {
            for (file of args.files) {
                if (!fs.existsSync(file)) {
                    console.log('File not found: ' + file);
                    process.exit(1);
                }
                // if (!fs.accessSync(file, fs.constants.R_OK)) {
                //     console.log('No access to file: ' + file);
                //     process.exit(1);
                // }
            }
        } else {
            console.log('No files provided');
            process.exit(1);
        }
    })
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

const groupCollection = getids(argv.group);
if (!groupCollection.key) {
    console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
    process.exit(1);
};
if (!groupCollection.group) {
    console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
    process.exit(1);
};
const collectionKey = groupCollection.key;
const group = groupCollection.group;
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
 */
async function main(infile) {
    let data;
    // handle command line arguments...
    if (argv.transform === 'jq') {
        data = await jqfilter(infile, argv.jq);
    } else if (argv.transform === 'openalexjq') {
        const filterfile = defaultPath+"/jq/openalex-to-zotero.jq";
        // check if file exists
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
    } else if (argv.transform === 'openalexjq-sdgs') {
        const filterfile = defaultPath + '/jq/openalex-to-zotero-sdgs.jq';
        // check if file exists
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
    } else if (argv.transform === 'openalexjs' || argv.transform === 'openalexjs-sdgs') {
        data = await openalexjs(infile, filterfile);
    } else {
        // ...
    }
    await upload(infile, data);
};

const openalexToZotero = require('./utils/openalex-to-zotero');

async function openalexjs(infile, filterfile) {
    // TODO: Implement this
    // uses utils/openalex-to-zotero.js
    const json = fs.readFileSync(infile, 'utf8');
    let data = openalexToZotero(json);
    return data;
}

async function jqfilter(infile, filterfile) {
    // load filterfile as json
    // check that filterfile exists
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
    // TODO: This needs a collection, collectionKey, and zotero object
    const result = await zotero.create_item({ files: [outf], collections: [collectionKey] });
    fs.writeFileSync(infile + ".zotero-result.json", JSON.stringify(result));
    // if the code below fails, you can resume from here:
    // const result = JSON.parse(fs.readFileSync(infile + ".zotero-result.json", 'utf8'));
    // console.log("data: " + JSON.stringify(result, null, 4));
    const zotobject = await jq.run("[ .[] | .successful | [ to_entries[] | .value.data ] ] | flatten ", result, { input: 'json', output: 'json' });
    fs.writeFileSync(infile + ".zotero-result-filtered.json", JSON.stringify(zotobject, null, 4));
    const inob = JSON.parse(fs.readFileSync(infile, 'utf8'));
    let openalexobject;
    if (argv.transform === 'openalexjq' || argv.transform === 'openalexjs') {
        openalexobject = await jq.run('.results | [ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
    } else if (argv.transform === 'openalexjq-sdgs' || argv.transform === 'openalexjs-sdgs') {
        openalexobject = await jq.run('[ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
    }
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
