const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const ObjectsToCsv = require('objects-to-csv');
const jq = require('node-jq');

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
            orderBy: {
                average_rank: 'desc'
            },
            ...(args.orderByRank && {
                orderBy: {
                    average_rank: args.orderByRank
                }
            }),
            ...(args.limit && { take: args.limit }),
            ...(args.relevance && {
                orderBy: {
                    _relevance: {
                        fields: args.rfields,
                        search: args.rstring,
                        sort: args.rsort
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
        else if (args.output.endsWith('.ris')) {
            const ris = data.map(item => {
                const keywords = item.keywords.split(',').map(keyword => `KW  - ${keyword}`).join('\n')
                const ids = item.item_ids.map((id) => `ID  - ${id}`).join('\n')
                return (
                    `TY  - RPRT\n` +
                    `TI  - ${item.title}\n` +
                    `AB  - ${item.abstract}\n` +
                    `PY  - ${item.date}\n` +
                    `DO  - ${item.doi}\n` +
                    (keywords.length > 0 ? keywords + '\n' : '') +
                    (ids.length > 0 ? ids + '\n' : '') +
                    `ER  - `
                )
            })
            fs.writeFileSync(filePath, ris.join('\n'));
        }
        console.log(`${data.length} Deduplicated exported to ${args.output}`.green);
    } catch (error) {
        console.error('Error: ', error.message);
    }
}


module.exports = { exportDeduplicate };

