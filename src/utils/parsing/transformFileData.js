#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const jq = require('node-jq');
const defaultPath = path.join(__dirname, '../../../');
const detectJsonSource = require('../utility');
const { openalexToZotero } = require('../openalex-to-zotero');

async function transformFileData({ infile, filterfile, transform, jq, tag, autotag }) {
    let data;
    let source = 'unknown';

    // handle command line arguments...
    if (transform === 'jq') {
        data = await jqfilter(infile, jq);
    } else if (transform === 'openalexjq') {
        const filterfile = defaultPath + "/jq/openalex-to-zotero.jq";
        // check if file exists
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
        // TODO: this is deprecated, so we should remove it.
    // } else if (transform === 'openalexjq-sdgs') {
    //     const filterfile = defaultPath + '/jq/openalex-to-zotero-sdgs.jq';
    //     // check if file exists
    //     if (!fs.existsSync(filterfile)) {
    //         console.log(`JQ file not found: ${filterfile}`);
    //         process.exit(1);
    //     }
    //     data = await jqfilter(infile, filterfile);
    } else if (transform === 'openalexjs' || transform === 'openalexjs-sdgs') {
        data = await openalexjs(infile, filterfile);
    } else if (transform === 'scholarlyjq') {
        const filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
        // check if file exists
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
    } else if (transform === 'scopusjq') {
        const filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
        // check if file exists
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
    } else if (transform === 'scitejq') {
        const filterfile = defaultPath + '/jq/scite-to-zotero.jq';
        // check if file exists
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
    } else {
        source = detectJsonSource(JSON.parse(fs.readFileSync(infile, 'utf8')));
        let filterfile;
        if (source === 'openalex') {
            filterfile = defaultPath + '/jq/openalex-to-zotero.jq';
        } else if (source === 'scholarly') {
            filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
        } else if (source === 'scopus') {
            filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
        } else if (source === 'scite') {
            filterfile = defaultPath + '/jq/scite-to-zotero.jq';
        } else {
            console.log('unknown source for :' + infile);
            return;
        }
        if (!fs.existsSync(filterfile)) {
            console.log(`JQ file not found: ${filterfile}`);
            process.exit(1);
        }
        data = await jqfilter(infile, filterfile);
    }
    data = JSON.parse(data);
    data = data.map((item) => {
        if (tag) {
            item.tags = item.tags || [];
            item.tags.push({ tag });
        }
        if (autotag) {
            item.tags = item.tags || [];
            item.tags.push({ tag: infile.replace(/\.json$/, '') });
        };
        return item;
    });

    return {
        data,
        source,
    };
};

async function openalexjs(infile) {
    const json = fs.readFileSync(infile, 'utf8');
    let data = openalexToZotero(json);
    return data;
}

async function jqfilter(infile, filterfile) {
    const filter = fs.readFileSync(filterfile, 'utf8');
    const infileObject = JSON.parse(fs.readFileSync(infile, 'utf8'));
    try {
        const data = await jq.run(filter,
            infileObject,
            { input: 'json', output: 'pretty' });
        return data;
    } catch (error){
        console.log(error.message);
        process.exit(1);
    }
};

module.exports = { transformFileData };
