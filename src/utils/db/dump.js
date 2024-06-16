const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jq = require('node-jq');
const ObjectsToCsv = require('objects-to-csv');

async function dump(tableArg, output, unscreened) {
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
        const data = await prisma[table].findMany({
            where: unscreened && table === 'Deduplicated' ? {
                screening: { is: null }
            } : {}
        });
        const parsedData = table === 'Deduplicated' ? await parseDeduplicated(data) : data;
        const csv = new ObjectsToCsv(parsedData);
        await csv.toDisk(nameWithExtension ? output : `${output}.csv`);
    } catch (error) {
        console.error('Error: ', error.message);
    }
}

async function parseDeduplicated(data) {
    try {
        const jqFilter = `
            [ .[] | {
                "title": .title,
                "abstract": .abstract,
                "keywords": .keywords,
                "doi": .doi,
                "date": .date,
                "key": .otherIdentifier,
                "flag": .flag
            } ]
        `;
        const filterData = await jq.run(jqFilter, data, { input: 'json', output: 'json' });
        return filterData;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

module.exports = { dump };





// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const jq = require('node-jq');
// const ObjectsToCsv = require('objects-to-csv');

// async function dump(tableArg, output, unscreened) {
//     const tables = ['SearchResults', "Deduplicated"];
//     try {
//         // Check if the table exists
//         const table = isNaN(Number(tableArg)) ? tables.find(t => t.toLowerCase() === tableArg.toLowerCase()) : tables[Number(tableArg) - 1];
//         if (!table) throw new Error('Table not found');
//         const nameWithExtension = output.includes('.')
//         if (nameWithExtension && !output.endsWith('.csv'))
//             throw new Error('Output file must be a .csv file');

//         // Dump the table
//         console.log(`Dumping ${table} table to ${output}`);

//         const chunkSize = 1000; // Set the desired chunk size
//         let offset = 0;
//         let hasMoreData = true;


//         while (hasMoreData) {
//             const data = await prisma[table].findMany({
//                 where: unscreened && table === 'Deduplicated' ? {
//                     screening: { is: null }
//                 } : {},
//                 skip: offset,
//                 take: chunkSize
//             });
//             const parsedData = table === 'Deduplicated' ? await parseDeduplicated(data) : data;
//             const csv = new ObjectsToCsv(parsedData);
//             await csv.toDisk(nameWithExtension ? output : `${output}.csv`, { append: offset > 0 });
//             offset += chunkSize;
//             hasMoreData = data.length === chunkSize;
//         }


//         // const data = await prisma[table].findMany({
//         //     where: unscreened && table === 'Deduplicated' ? {
//         //         screening: { is: null }
//         //     } : {}
//         // });


//         // const parsedData = table === 'Deduplicated' ? await parseDeduplicated(data) : data;
//         // const csv = new ObjectsToCsv(parsedData);
//         // await csv.toDisk(nameWithExtension ? output : `${output}.csv`);
//     } catch (error) {
//         console.error('Error: ', error.message);
//     }
// }

// async function parseDeduplicated(data) {
//     try {
//         const jqFilter = `
//             [ .[] | {
//                 "title": .title,
//                 "abstract": .abstract,
//                 "keywords": .keywords,
//                 "doi": .doi,
//                 "date": .date,
//                 "key": .otherIdentifier,
//                 "flag": .flag
//             } ]
//         `;
//         const filterData = await jq.run(jqFilter, data, { input: 'json', output: 'json' });
//         return filterData;
//     } catch (error) {
//         console.error(error);
//         process.exit(1);
//     }
// }

// module.exports = { dump };

