#!/usr/bin/env node
const fs = require('fs');
const yargs = require('yargs');
const { setupZoteroConfig } = require('./utils/config/setupZoteroConfig');
const { setupDatabase } = require('./utils/config/setupDatabase');
const { deduplicate } = require('./utils/db/deduplicate');
const { uploadToZotero } = require('./utils/zotero/uploadToZotero');
const { uploadToDatabase } = require('./utils/db/uploadToDatabase');

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
    .command('db-set-connection [url]', 'Setup the database', (yargs) => {
        yargs.positional('url', {
            describe: 'Database URL',
            type: 'string',
            array: true,
        })
    })
    .command('db-upload [files...]', 'Upload data to the database', (yargs) => {
        yargs.option('transform', {
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
            ]
        }).positional('files', {
            describe: 'One or more files',
            type: 'string',
            array: true,
        })
    })
    .command('db-deduplicate', 'Deduplicate the database')
    .command('zotero [files...]', 'Upload data to zotero', (yargs) => {
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
        if (!['zotero', 'db-upload'].includes(args._[0]))
            return;
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
            }
        }
        if (args.files && args.files.length > 0) {
            for (file of args.files) {
                try {
                    const stats = fs.statSync(file);
                    if (!stats.isFile()) {
                        console.log('Path is not a file: ' + file);
                        process.exit(1);
                    }
                } catch {
                    console.log('File not found: ' + file);
                    process.exit(1);
                }
            }
        } else {
            console.log('No files provided');
            process.exit(1);
        }
    })
    .parse();


(async () => {
    const argValue = await argv;

    if (argValue._[0] === 'config') {
        if (argValue.set === 'api-key')
            await setupZoteroConfig();
        else if (argValue.set === 'database')
            await setupDatabase();
        return;
    }
    if (argValue._[0] === 'db-upload') {
        await uploadToDatabase(argValue);
        return;
    }
    if (argValue._[0] === 'db-deduplicate') {
        await deduplicate();
        return;
    }
    if (argValue._[0] === 'zotero') {
        await uploadToZotero(argValue);
        return;
    }
    if (argValue._[0] === 'db-set-connection') {
        await setupDatabase(argValue.url);
        return;
    }
})()
