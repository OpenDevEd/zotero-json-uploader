#!/usr/bin/env node
const Zotero = require('zotero-lib');
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const defaultPath = path.join(__dirname, '..');
const { input, select } = require('@inquirer/prompts');
const os = require('os');
const detectJsonSource = require('./utils/utility');
const { uploadSearchResults } = require('./utils/db/uploadSearchResults');
const { parseSearchResults } = require('./utils/parsing/parseSearchResults');
const { setupZoteroConfig } = require('./utils/config/setupZoteroConfig');
const openalexToZotero = require('./utils/openalex-to-zotero');
const { setupDatabase } = require('./utils/config/setupDatabase');
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
    .command(
        'config',
        'Setup Zotero configuration or database configuration',
        (yargs) => {
            yargs.option('set', {
                alias: '-s',
                describe: 'Set the configuration',
                type: 'string',
                demandOption: true,
            });
        }
    )
    .command('$0 action [files...]', 'Example script', (yargs) => {
        yargs.positional('files', {
            describe: 'One or more files',
            type: 'string',
            array: true,
        })
            .option('group', {
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
                    'openalexjq',
                    'openalexjs-sdgs',
                    'openalexjs',
                    'scholarlyjq',
                    'openalexjq-sdgs',
                    'scopusjq',
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
            });
    })
    .help()
    .alias('help', 'h')
    .middleware(async (args) => {
        if (args._[0] === 'config') {
            if (args.set === 'api-key')
                await setupZoteroConfig();
            else if (args.set === 'database')
                await setupDatabase();
            process.exit(0);
        }
        if (!args.transform) {
            args.transform = 'auto';
        } else {
            if (args.transform === 'jq' && !args.jq) {
                console.log('JQ option is missing');
                process.exit(1);
            }

            const transformOptions = [
                'jq',
                'openalexjq',
                'openalexjs-sdgs',
                'openalexjs',
                'scholarlyjq',
                'openalexjq-sdgs',
                'scopusjq',
            ];
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
        if (['zotero', 'db-upload'].find(item => args.action === item))
            await run(args);
        else {
            console.log('Unknown action, please provide a valid action (zotero/db-upload)');
            process.exit(1);
        }
    })
    .parse();




async function run(argv) {
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
    let collections = [];
    if (argv.collections) {
        collections = argv.collections.split(',');
    }


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
        let dbdata;
        let source = 'unknown';
        // handle command line arguments...
        if (argv.transform === 'jq') {
            data = await jqfilter(infile, argv.jq);
            dbdata = await jqfilter(infile, argv.jq.replace('zotero', 'database'));
        } else if (argv.transform === 'openalexjq') {
            const filterfile = defaultPath + "/jq/openalex-to-zotero.jq";
            const dbfilterfile = defaultPath + "/jq/openalex-to-database.jq";
            // check if file exists
            if (!fs.existsSync(filterfile)) {
                console.log(`JQ file not found: ${filterfile}`);
                process.exit(1);
            }
            data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
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
        } else if (argv.transform === 'scholarlyjq') {
            const filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
            const dbfilterfile = defaultPath + '/jq/scholarly-to-database.jq';
            // check if file exists
            if (!fs.existsSync(filterfile)) {
                console.log(`JQ file not found: ${filterfile}`);
                process.exit(1);
            }
            data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
        } else if (argv.transform === 'scopusjq') {
            const filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
            const dbfilterfile = defaultPath + '/jq/scopus-to-database.jq';
            // check if file exists
            if (!fs.existsSync(filterfile)) {
                console.log(`JQ file not found: ${filterfile}`);
                process.exit(1);
            }
            data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
        } else {
            source = detectJsonSource(JSON.parse(fs.readFileSync(infile, 'utf8')));
            let filterfile;
            let dbfilterfile;
            if (source === 'openalex') {
                filterfile = defaultPath + '/jq/openalex-to-zotero.jq';
                dbfilterfile = defaultPath + '/jq/openalex-to-database.jq';
            } else if (source === 'scholarly') {
                filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
                dbfilterfile = defaultPath + '/jq/scholarly-to-database.jq';
            } else if (source === 'scopus') {
                filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
                dbfilterfile = defaultPath + '/jq/scopus-to-database.jq';
            } else {
                console.log('unknown source for :' + infile);
                return;
            }
            if (!fs.existsSync(filterfile)) {
                console.log(`JQ file not found: ${filterfile}`);
                process.exit(1);
            }
            data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
        }
        data = JSON.parse(data);
        data = data.map((item) => {
            if (argv.tag) {
                item.tags = item.tags || [];
                item.tags.push({ tag: argv.tag });
            }
            return item;
        });

        if (argv.action === 'zotero') {
            await upload(infile, JSON.stringify(data, null, 4), source);
        }
        if (argv.action === 'db-upload') {
            // generate data for database
            const outdbf = infile + ".database.json";
            fs.writeFileSync(outdbf, dbdata);
            // upload data to database
            try {
                await uploadSearchResults(parseSearchResults(dbdata));
            } catch (error) {
                console.error(error.message)
            }
        }
    };

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

    async function upload(infile, data, source) {
        const outf = infile + ".zotero.json";
        fs.writeFileSync(outf, data);
        // TODO: This needs a collection, collectionKey, and zotero object
        const result = await zotero.create_item({ files: [outf], collections: [collectionKey, ...collections] });
        fs.writeFileSync(infile + ".zotero-result.json", JSON.stringify(result));
        // if the code below fails, you can resume from here:
        // const result = JSON.parse(fs.readFileSync(infile + ".zotero-result.json", 'utf8'));
        // console.log("data: " + JSON.stringify(result, null, 4));
        const zotobject = await jq.run("[ .[] | .successful | [ to_entries[] | .value.data ] ] | flatten ", result, { input: 'json', output: 'json' });
        fs.writeFileSync(infile + ".zotero-result-filtered.json", JSON.stringify(zotobject, null, 4));
        const aiscreening = zotobject.map((item) => {
            const extra = item.extra || '';
            const lines = extra.split('\n');
            const id = lines.find((line) => line.startsWith('id:')).split('id:')[1].trim();
            const keywordsString = lines.find((line) => line.startsWith('keywords:'));
            const keywords = keywordsString ? keywordsString.split('keywords:')[1].split(',').map((keyword) => keyword.trim()) : [];
            return {
                id,
                title: item.title,
                abstract: item.abstractNote,
                keywords,
            };
        });
        console.log("AIScreening: " + JSON.stringify(aiscreening, null, 4));
        fs.writeFileSync(infile + ".aiscreening.json", JSON.stringify(aiscreening, null, 4));
        const inob = JSON.parse(fs.readFileSync(infile, 'utf8'));
        let openalexobject;
        if (argv.transform === 'openalexjq' || argv.transform === 'openalexjs' || source === 'openalex') {
            openalexobject = await jq.run('.results | [ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
            fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
        } else if (argv.transform === 'openalexjq-sdgs' || argv.transform === 'openalexjs-sdgs') {
            openalexobject = await jq.run('[ .[] | { "key": .id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
            fs.writeFileSync(infile + ".oa-object.json", JSON.stringify(openalexobject, null, 4));
        }
        let scholarlyobject;
        if (argv.transform === 'scholarlyjq' || source === 'scholarly') {
            scholarlyobject = await jq.run('.results | [ .[] | { "key": .bib.bib_id, "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
            fs.writeFileSync(infile + ".scholarly-object.json", JSON.stringify(scholarlyobject, null, 4));
        }
        let scopusobject;
        if (argv.transform === 'scopusjq' || source === 'scopus') {
            scopusobject = await jq.run('."search-results" | .entry | [ .[] | { "key": ."dc:identifier", "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
            fs.writeFileSync(infile + ".scopus-object.json", JSON.stringify(scopusobject, null, 4));
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
}