#!/usr/bin/env node
const fs = require('fs');
const yargs = require('yargs');
const { setupZoteroConfig } = require('./utils/config/setupZoteroConfig');
const { setupDatabase } = require('./utils/config/setupDatabase');
const { deduplicate } = require('./utils/db/deduplicate');
const { uploadToDatabase } = require('./utils/db/uploadToDatabase');
const { dump } = require('./utils/db/dump');
const { init } = require('./utils/init');
const { deleteSearch } = require('./utils/db/deleteSearch');
const { dbUploadScreening } = require('./utils/db/dbUploadScreening');

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
    .command('$0 action [files...]', 'Example script')
    .command(
        'db-dump',
        'Dump the database',
        (yargs) => {
            yargs.option('table', {
                alias: '-t',
                describe: 'Table to dump',
                type: 'string',
                demandOption: true,
            });
            yargs.option('output', {
                alias: '-o',
                describe: 'Output file',
                type: 'string',
                demandOption: true,
            }).option('unscreened', {
                alias: '-u',
                describe: 'Retrieve unscreened data',
                type: 'boolean',
                default: false,
            })
        }
    )
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
    .command('db-delete [searchId]', 'Delete a search from the database', (yargs) => {
        yargs.positional('searchId', {
            alias: '-s',
            describe: 'Search ID',
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
    .command('db-upload-screening [files...]', 'Upload screening data to the database', (yargs) => {
        yargs.option('files', {
            alias: 'f',
            describe: 'File to upload',
            type: 'string',
            demandOption: true,
        })
    })
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
                    'openalex',
                    'openalexjs',
                    'scholarly',
                    'scopus',
                    'scitejq',
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
            })
            .option('autocollection', {
                alias: 'C',
                describe: 'For each file provided, a new collection is created, using the file name as the collection name',
                type: 'boolean',
                default: false,
            })
            .option('autotag', {
                alias: 'A',
                describe: 'For each file provided, a new tag is created, using the file name as the tag name',
                type: 'boolean',
                default: false,
            }).option('attachoriginalmetadata', {
                alias: 'O',
                describe: 'Attach original metadata to the file',
                type: 'boolean',
                default: false,
            });
    })
    .help()
    .alias('help', 'h')
    .middleware(async (args) => {
        if (!['zotero', 'db-upload'].includes(args._[0]))
            return;
        if (args.transform === 'jq' && !args.jq) {
            console.log('JQ option is missing');
            process.exit(1);
        }

        const transformOptions = [
            'jq',
            'openalex',
            'openalexjs',
            'scholarly',
            'scopus',
            'scitejq',
        ];

        if (args.transform == "openalexjs") {
            // TODO: openalexjs transform option not implemented yet
            console.log('openalexjs transform option not implemented yet');
            process.exit(1);
        };

        if (args.transform && !transformOptions.includes(args.transform)) {
            console.log('Transformation option is not one of the options');
            process.exit(1);
        }

        if (args.jq) {
            if (!fs.existsSync(args.jq)) {
                console.log('JQ file not found');
                process.exit(1);
            }
        }

        if (args.jq && !args.transform) {
            // Allow both `--jq abc.jq --transform jq` and just `--jq abc.jq`.
            /* 
            If these conditions are met, the code sets the transform argument to "jq". 
            This allows the user to either provide both --jq abc.jq --transform jq or just --jq abc.jq when running the script. 
            In the latter case, the transform argument is automatically set to "jq".
            */
            args.transform = "jq";
        };
        if (args.jq && args.transform != 'jq') {
            // If jq file is provided, transform option must be jq
            // Disallow, e.g. `--jq abc.jq --transform openalexjq`
            console.log('JQ file provided but transform option is not jq: Remove --jq or change transform option (--transform) to jq');
            process.exit(1);
        };



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
        await init(argValue);
        return;
    }
    if (argValue._[0] === 'db-dump') {
        await dump(argValue.table, argValue.output, argValue.unscreened);
        return;
    }
    if (argValue._[0] === 'db-delete') {
        if (argValue.searchId)
            deleteSearch(argValue.searchId);
        else {
            console.log('Search ID not provided');
        }
        return;
    }
    if (argValue._[0] === 'db-upload-screening') {
        for (file of argValue.files) {
            dbUploadScreening(file);
        }
        return;
    }
    console.log('Command not found');
})()

