#!/usr/bin/env node
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');
const path = require('path');
const defaultPath = path.join(__dirname, '../../../');
const { uploadSearchResults } = require('../db/uploadSearchResults');
const { parseSearchResults } = require('../parsing/parseSearchResults');
const openalexToZotero = require('../openalex-to-zotero');
const detectJsonSource = require('../utility');

async function UploadToDatabase(argv) {
    /*
    -t jq -j myjqfile.jq
    -t openalexjq
    -t openalexjs
    -t scholarlyjq
    */
    //TODO: argv.zoterojs or argv.jq needs to be present. 
    // Example of accessing the arguments
    // console.log(`Group/collection: ${argv.group}`);
    // if (argv.files) {
    //     console.log(`Files: ${argv.files.join(', ')}`);
    // } else {
    //     console.log('No files provided');
    //     process.exit(1);
    // }

    // function to get ids from zotero://-style link
    // function getids(newlocation) {
    //     const res = newlocation.match(
    //         /^zotero\:\/\/select\/groups\/(library|\d+)\/(items|collections)\/([A-Z01-9]+)/
    //     );
    //     let x = {};
    //     if (res) {
    //         x.key = res[3];
    //         x.type = res[2];
    //         x.group = res[1];
    //     } else {
    //         x.key = newlocation;
    //     }
    //     return x;
    // }

    // const groupCollection = getids(argv.group);
    // if (!groupCollection.key) {
    //     console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
    //     process.exit(1);
    // };
    // if (!groupCollection.group) {
    //     console.log('Require: --group -> zotero://-style link to a group (mandatory argument)');
    //     process.exit(1);
    // };
    // const collectionKey = groupCollection.key;
    // const group = groupCollection.group;
    // const filterfile = argv.jq;
    // const files = argv.files;
    // let collections = [];
    // if (argv.collections) {
    //     collections = argv.collections.split(',');
    // }


    // //    .replace(/\"DUMMY_IMPORT_COLLECTION\"/g, '');
    // // console.log(filter);

    // const zotero = new Zotero({ group_id: group });
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
        // let data;
        let dbdata;
        let source = 'unknown';
        // handle command line arguments...
        if (argv.transform === 'jq') {
            // data = await jqfilter(infile, argv.jq);
            dbdata = await jqfilter(infile, argv.jq.replace('zotero', 'database'));
        } else if (argv.transform === 'openalexjq') {
            // const filterfile = defaultPath + "/jq/openalex-to-zotero.jq";
            const dbfilterfile = defaultPath + "/jq/openalex-to-database.jq";
            // check if file exists
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            // data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
            // } else if (argv.transform === 'openalexjq-sdgs') {
            // const filterfile = defaultPath + '/jq/openalex-to-zotero-sdgs.jq';
            // check if file exists
            // if (!fs.existsSync(filterfile)) {
            //     console.log(`JQ file not found: ${filterfile}`);
            //     process.exit(1);
            // }
            // data = await jqfilter(infile, filterfile);
            // } else if (argv.transform === 'openalexjs' || argv.transform === 'openalexjs-sdgs') {
            // data = await openalexjs(infile, filterfile);
        } else if (argv.transform === 'scholarlyjq') {
            // const filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
            const dbfilterfile = defaultPath + '/jq/scholarly-to-database.jq';
            // check if file exists
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            // data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
        } else if (argv.transform === 'scopusjq') {
            // const filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
            const dbfilterfile = defaultPath + '/jq/scopus-to-database.jq';
            // check if file exists
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            // data = await jqfilter(infile, dbfilterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
        } else {
            source = detectJsonSource(JSON.parse(fs.readFileSync(infile, 'utf8')));
            // let filterfile;
            let dbfilterfile;
            if (source === 'openalex') {
                // filterfile = defaultPath + '/jq/openalex-to-zotero.jq';
                dbfilterfile = defaultPath + '/jq/openalex-to-database.jq';
            } else if (source === 'scholarly') {
                // filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
                dbfilterfile = defaultPath + '/jq/scholarly-to-database.jq';
            } else if (source === 'scopus') {
                // filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
                dbfilterfile = defaultPath + '/jq/scopus-to-database.jq';
            } else {
                console.log('unknown source for :' + infile);
                return;
            }
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            // data = await jqfilter(infile, filterfile);
            dbdata = await jqfilter(infile, dbfilterfile);
        }
        // data = JSON.parse(data);
        // data = data.map((item) => {
        //     if (argv.tag) {
        //         item.tags = item.tags || [];
        //         item.tags.push({ tag: argv.tag });
        //     }
        //     return item;
        // });

        try {
            const outdbf = infile + ".database.json";
            fs.writeFileSync(outdbf, dbdata);
            await uploadSearchResults(parseSearchResults(dbdata));
        } catch (error) {
            console.error(error.message)
        }
    };

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

    (async () => {
        for (file of argv.files) {
            await main(file);
        };
    })();
}

module.exports = {
    UploadToDatabase
}