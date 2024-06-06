const path = require('path');
const jq = require('node-jq');
const defaultPath = path.join(__dirname, '../../../');
const fs = require('fs');

async function dbUploadScreening(file) {
    try {
        const pathFile = path.join(defaultPath, file);
        const filterData = await jq.run('[ .[] | { "resultOfScreening": . } ]', pathFile);

        console.log((filterData));


        console.log('Not implemented yet');
    } catch {
        console.log('File not found: ' + file);
    }
}

module.exports = { dbUploadScreening };