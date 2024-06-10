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
        // handle command line arguments...
        const argvTransformOptionsAndSourceMapping = {
            'jq': argv.jq,
            'openalex': defaultPath + "/jq/openalex-to-zotero.jq",
            'scholarly': defaultPath + '/jq/scholarly-to-zotero.jq',
            'scopus': defaultPath + '/jq/scopus-to-zotero.jq',
            'scite': defaultPath + '/jq/scite-to-zotero.jq',
            'openalexjs': null
        };

        let mytransform = '';
        if (argv.transform) {
            if (Object.keys(argvTransformOptionsAndSourceMapping).includes(argv.transform)) {
                mytransform = argv.transform;
            } else {
                console.log('unknown manual transform option: ' + argv.transform);
                process.exit(1);
            }
        } else {
            const source = detectJsonSource(JSON.parse(fs.readFileSync(infile, 'utf8')));
            if (Object.keys(argvTransformOptionsAndSourceMapping).includes(source)) {
                mytransform = argvTransformOptionsAndSourceMapping[source];
            } else {
                console.log(`Unknown source (${source}) / automatic transform for:` + infile);
                process.exit(1);
            }
        };
        // argv.transform is not provided, therefore detect source.
        if (!fs.existsSync(mytransform)) {
            console.log(`JQ file not found: ${dbfilterfile}`);
            process.exit(1);
        }
        dbdata = await jqfilter(infile, mytransform);
        try {
            // TODO: There's similar code in uploadZotero.js -> extract to a function
            const inDirectory = path.dirname(infile);
            const inFilename = path.basename(infile);
            if (!fs.existsSync(inDirectory + "/extra_json/")) {
                fs.mkdirSync(inDirectory + "/extra_json/");
            };
            const inFileExtra = inDirectory + "/extra_json/" + inFilename;
            const outdbf = inFileExtra + ".database.json";
            fs.writeFileSync(outdbf, dbdata);
            // Upload to database 
            await uploadSearchResults(await parseSearchResults(dbdata));
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

module.exports = { uploadToDatabase }