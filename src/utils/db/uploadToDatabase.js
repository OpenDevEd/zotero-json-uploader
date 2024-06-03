#!/usr/bin/env node
const jq = require('node-jq');
const fs = require('fs');
const path = require('path');
const defaultPath = path.join(__dirname, '../../../');
const { uploadSearchResults } = require('../db/uploadSearchResults');
const { parseSearchResults } = require('../parsing/parseSearchResults');
const detectJsonSource = require('../utility');

async function uploadToDatabase(argv) {
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
        console.log(`Processing file: ${infile}`);
        let dbdata;
        let source = 'unknown';
        // handle command line arguments...
        const transformMapping = {
            // 'jq': argv.jq.replace('zotero', 'database'),
            'openalexjq': defaultPath + "/jq/openalex-to-zotero.jq",
            'scholarlyjq': defaultPath + '/jq/scholarly-to-zotero.jq',
            'scopusjq': defaultPath + '/jq/scopus-to-zotero.jq'
        };

        if (Object.keys(transformMapping).includes(argv.transform)) {
            const dbfilterfile = transformMapping[argv.transform];
            if (argv.transform !== 'jq' && !fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            dbdata = await jqfilter(infile, dbfilterfile);
        } else {
            source = detectJsonSource(JSON.parse(fs.readFileSync(infile, 'utf8')));
            let dbfilterfile;
            const sourceMapping = {
                'openalex': defaultPath + '/jq/openalex-to-zotero.jq',
                'scholarly': defaultPath + '/jq/scholarly-to-zotero.jq',
                'scopus': defaultPath + '/jq/scopus-to-zotero.jq'
            };
            if (Object.keys(sourceMapping).includes(source)) {
                dbfilterfile = sourceMapping[source];
            } else {
                console.log('unknown source for :' + infile);
                return;
            }
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            dbdata = await jqfilter(infile, dbfilterfile);
        }

        try {
            const outdbf = infile + ".database.json";
            fs.writeFileSync(outdbf, dbdata);
            // Upload to database 
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
            { input: 'json', output: 'pretty' }
        );

        return JSON.stringify({
            meta: infileObject.meta,
            results: JSON.parse(data),
        });
    };

    (async () => {
        for (file of argv.files) {
            await main(file);
        };
    })();
}

module.exports = {
    uploadToDatabase
}