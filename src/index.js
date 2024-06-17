#!/usr/bin/env node
const yargs = require('yargs');
const { setupZoteroConfig } = require('./utils/config/setupZoteroConfig');
const { setupDatabase } = require('./utils/config/setupDatabase');
const { deduplicate } = require('./utils/db/deduplicate');
const { uploadToDatabase } = require('./utils/db/uploadToDatabase');
const { dump } = require('./utils/db/dump');
const { init } = require('./utils/init');
const { deleteSearch } = require('./utils/db/deleteSearch');
const { yargsMiddleware } = require('./middlewares/yargsMiddleware');

// Commands
const { dbDump } = require('./commands/dbDump');
const { config } = require('./commands/config');
const { dbSetConnection } = require('./commands/dbSetConnection');
const { dbDelete } = require('./commands/dbDelete');
const { dbUpload } = require('./commands/dbUpload');
const { dbUploadScreening } = require('./utils/db/dbUploadScreening');
const { uploadToZotero } = require('./commands/uploadToZotero');
const { dbDeduplicate } = require('./commands/dbDeduplicate');
const { exportDeduplicate } = require('./utils/db/exportDeduplicate');
const path = require('path');

// Load environment variables
require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

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
    // .command('$0 action [files...]', '')
    .command('db-dump', 'Dump the database', dbDump)
    .command('config', 'Setup Zotero configuration or database configuration', config)
    .command('db-set-connection [url]', 'Setup the database', dbSetConnection)
    .command('db-delete [searchId]', 'Delete a search from the database', dbDelete)
    .command('db-upload [files...]', 'Upload data to the database', dbUpload)
    .command('db-deduplicate', 'Deduplicate the database', dbDeduplicate)
    .command('db-upload-screening [files...]', 'Upload screening data to the database', dbUploadScreening)
    .command('zotero [files...]', 'Upload data to zotero', uploadToZotero)
    .help()
    .alias('help', 'h')
    .middleware(yargsMiddleware)
    .parse();

// main
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
        if (argValue.export) await exportDeduplicate(argValue);
        else await deduplicate();
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
        else
            console.log('Search ID not provided');
        return;
    }
    if (argValue._[0] === 'db-upload-screening') {
        for (file of argValue.files)
            dbUploadScreening(file);
        return;
    }

    console.log('Command not found');
})()

