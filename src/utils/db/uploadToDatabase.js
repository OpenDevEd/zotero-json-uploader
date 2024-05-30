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
        if (argv.transform === 'jq') {
            dbdata = await jqfilter(infile, argv.jq.replace('zotero', 'database'));
        } else if (argv.transform === 'openalexjq') {
            const dbfilterfile = defaultPath + "/jq/openalex-to-database.jq";
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            dbdata = await jqfilter(infile, dbfilterfile);
        } else if (argv.transform === 'scholarlyjq') {
            const dbfilterfile = defaultPath + '/jq/scholarly-to-database.jq';
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            dbdata = await jqfilter(infile, dbfilterfile);
        } else if (argv.transform === 'scopusjq') {
            const dbfilterfile = defaultPath + '/jq/scopus-to-database.jq';
            if (!fs.existsSync(dbfilterfile)) {
                console.log(`JQ file not found: ${dbfilterfile}`);
                process.exit(1);
            }
            dbdata = await jqfilter(infile, dbfilterfile);
        } else {
            source = detectJsonSource(JSON.parse(fs.readFileSync(infile, 'utf8')));
            let dbfilterfile;
            if (source === 'openalex') {
                dbfilterfile = defaultPath + '/jq/openalex-to-database.jq';
            } else if (source === 'scholarly') {
                dbfilterfile = defaultPath + '/jq/scholarly-to-database.jq';
            } else if (source === 'scopus') {
                dbfilterfile = defaultPath + '/jq/scopus-to-database.jq';
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
            console.log(`Database JSON written to: ${outdbf}`);
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
    uploadToDatabase
}