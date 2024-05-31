#!/usr/bin/env node
const Zotero = require('zotero-lib');
const jq = require('node-jq');
// const OpenAlex = require('openalex-sdk');
const fs = require('fs');
const path = require('path');
const defaultPath = path.join(__dirname, '../../../');
const openalexToZotero = require('../openalex-to-zotero');
const detectJsonSource = require('../utility');

async function uploadToZotero(argv) {
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

    const zotero = new Zotero({ group_id: group });

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
        let source = 'unknown';
        // handle command line arguments...
        if (argv.transform === 'jq') {
            data = await jqfilter(infile, argv.jq);
        } else if (argv.transform === 'openalexjq') {
            const filterfile = defaultPath + "/jq/openalex-to-zotero.jq";
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
        } else if (argv.transform === 'scholarlyjq') {
            const filterfile = defaultPath + '/jq/scholarly-to-zotero.jq';
            // check if file exists
            if (!fs.existsSync(filterfile)) {
                console.log(`JQ file not found: ${filterfile}`);
                process.exit(1);
            }
            data = await jqfilter(infile, filterfile);
        } else if (argv.transform === 'scopusjq') {
            const filterfile = defaultPath + '/jq/scopus-to-zotero.jq';
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
            if (argv.tag) {
                item.tags = item.tags || [];
                item.tags.push({ tag: argv.tag });
            }
            return item;
        });


        await zotero_upload(infile, JSON.stringify(data, null, 4), source);
    };

    async function openalexjs(infile) {
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

    async function zotero_upload(infile, data, source) {
        const inDirectory = path.dirname(infile);
        const inFilename = path.basename(infile);
        // make inDirectory + "extra_json/" if it doesn't exist:
        if (!fs.existsSync(inDirectory + "extra_json/")) {
            fs.mkdirSync(inDirectory + "extra_json/");
        };
        const inFileExtra = inDirectory + "extra_json/" + inFilename;
        // Can you change references like this as follows:
        const outf = inFileExtra + ".zotero.json";
        fs.writeFileSync(outf, data);
        // TODO: This needs a collection, collectionKey, and zotero object
        let mycollections = [collectionKey, ...collections];
        if (argv.autocollections) {
            mycollections = [...mycollections, infile];
        };
        const mytags = argv.autotags ? [infile] : [];
        const result = await zotero.create_item({ files: [outf], collections: mycollections, tags: mytags });
        fs.writeFileSync(inFileExtra + ".zotero-result.json", JSON.stringify(result));
        // if the code below fails, you can resume from here:
        const zotobject = await jq.run("[ .[] | .successful | [ to_entries[] | .value.data ] ] | flatten ", result, { input: 'json', output: 'json' });
        fs.writeFileSync(inFileExtra + ".zotero-result-filtered.json", JSON.stringify(zotobject, null, 4));
        // This object is what you need for the database (Table 2, deduplicated).
        // So no separate transform is needed: The correct data is already generated.
        // The only difference is the ID. I'm not sure what this ID is here... 
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
        fs.writeFileSync(inFileExtra + ".aiscreening.json", JSON.stringify(aiscreening, null, 4));
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
            scopusobject = await jq.run('.results | [ .[] | { "key": ."dc:identifier", "value": . } ] | from_entries', inob, { input: 'json', output: 'json' });
            fs.writeFileSync(infile + ".scopus-object.json", JSON.stringify(scopusobject, null, 4));
        }
        const tempdir = "temp";
        if (!fs.existsSync(tempdir)) {
            fs.mkdirSync(tempdir);
        };
        if (argv.attachoriginalmetadata) {
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
    (async () => {
        for (file of files) {
            await main(file);
        };
    })();
}

module.exports = {
    uploadToZotero
}