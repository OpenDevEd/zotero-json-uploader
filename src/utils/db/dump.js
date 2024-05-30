const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ObjectsToCsv = require('objects-to-csv');

async function dump(table, output) {
    const tables = ['SearchResults', "Deduplicated"];
    try {
        // check the output file name that is .csv
        if (!output.endsWith('.csv'))
            throw new Error('Output file must be a .csv file');
        console.log(`Dumping ${tables[Number(table) + 1]} table to ${output}`);
        const data = await prisma[tables[table]].findMany();
        const csv = new ObjectsToCsv(data);
        await csv.toDisk(output);
    } catch (error) {
        console.error('Error dumping table:', error.message);
    }
}

module.exports = { dump };

