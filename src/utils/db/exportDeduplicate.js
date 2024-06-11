const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const ObjectsToCsv = require('objects-to-csv');

async function exportDeduplicate(args) {
    try {
        console.log('Exporting deduplicated data...'.yellow);
        const data = await prisma.deduplicated.findMany({
            ...(args.rank && {
                where: {
                    average_rank: {
                        [args.compare]: args.rank
                    }
                }
            }),
            ...(args.limit && { take: args.limit }),
            ...(args.relevance && {
                orderBy: {
                    _relevance: {
                        fields: args.fields,
                        search: args.search,
                        sort: args.sort
                    }
                }
            })
        });
        // Export the data to a file json
        const filePath = path.join(process.cwd(), args.output);
        if (args.output.endsWith('.csv')) {
            const csv = new ObjectsToCsv(data);
            await csv.toDisk(filePath);
        } else if (args.output.endsWith('.json')) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        console.log('Deduplicated data exported to', `${filePath}`.yellow);
    } catch (error) {
        console.error('Error: ', error.message);
    }
}


module.exports = { exportDeduplicate };

