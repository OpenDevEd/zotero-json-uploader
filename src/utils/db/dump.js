const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ObjectsToCsv = require('objects-to-csv');

async function dump(tableArg, output) {
    const tables = ['SearchResults', "Deduplicated"];
    try {
        // Check if the table exists
        const table = isNaN(Number(tableArg)) ? tables.find(t => t.toLowerCase() === tableArg.toLowerCase()) : tables[Number(tableArg) - 1];
        if (!table) throw new Error('Table not found');
        const nameWithExtension = output.includes('.')
        if (nameWithExtension && !output.endsWith('.csv'))
            throw new Error('Output file must be a .csv file');

        // Dump the table
        console.log(`Dumping ${table} table to ${output}`);
        const data = await prisma[table].findMany();
        const csv = new ObjectsToCsv(data);
        await csv.toDisk(nameWithExtension ? output : `${output}.csv`);
    } catch (error) {
        console.error('Error dumping table:', error.message);
    }
}

module.exports = { dump };

