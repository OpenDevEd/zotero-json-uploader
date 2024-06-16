const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const colors = require('colors')
const fs = require('fs');
const uuid = require('uuid');

async function deduplicate() {
    // await prisma.deduplicated.deleteMany();
    // await prisma.searchResults_Deduplicated.deleteMany();
    // await prisma.searchResults.deleteMany();
    // process.exit()
    try {
        console.log('Init deduplication process...'.yellow);
        // clean up the deduplicated many-to-many table
        await prisma.searchResults_Deduplicated.deleteMany({
            where: {
                OR: [
                    { deduplicatedId: { equals: null } },
                    { searchResultsId: { equals: null } },
                ],
            }
        });

        const searchResultsLenght = await prisma.searchResults.count({
            where: { SearchResults_Deduplicated: { none: {} } },
        });
        const chunkSize = 500;
        const take = 0;
        let totalSearchResultsProcessed = 0;
        console.log(`Total search results to process: ${searchResultsLenght}`.yellow);
        console.log('Processing duplicates...'.yellow);
        do {
            const duplicates = await prisma.searchResults.findMany({
                where: { SearchResults_Deduplicated: { none: {} } },
                skip: take,
                take: chunkSize,
            });
            const duplicatesCount = duplicates.length;
            if (duplicatesCount !== 0)
                await deduplicateSearchResultV2(duplicates);
            process.stdout.write(`\rProcessed: ${totalSearchResultsProcessed + duplicatesCount}/${searchResultsLenght}`);
            totalSearchResultsProcessed += duplicatesCount;
        } while (totalSearchResultsProcessed < searchResultsLenght);
        console.log('\nDeduplication complete.'.green);

    } catch (error) {
        console.log(error)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error('An error occurred...'.red);
            // Handle known errors
            if (error.code === 'P2002') {
                console.log('Duplicate entry found:', error.meta.target);
            }
            // Add more known error codes as needed
        } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            console.error('An unknown error occurred:', error.message);
        } else if (error instanceof Prisma.PrismaClientRustPanicError) {
            console.error('A Rust panic occurred:', error.message);
        } else if (error instanceof Prisma.PrismaClientInitializationError) {
            console.error('Prisma Client initialization error:', error.message);
        } else {
            console.error('An unexpected error occurred:', error);
        }
    }
}

// increase the speed
async function deduplicateSearchResultV2(searchResults) {
    const { searchResultsThatHasDoi, searchResultsThatHasNoDoi } = searchResults.reduce((acc, item) => {
        if (item.doi) acc.searchResultsThatHasDoi.push(item);
        else acc.searchResultsThatHasNoDoi.push(item);
        return acc;
    }, { searchResultsThatHasDoi: [], searchResultsThatHasNoDoi: [] });

    const deduplicated = await prisma.deduplicated.findMany({
        where: {
            OR: [
                {
                    doi: { in: searchResultsThatHasDoi.map(i => i.doi), notIn: [''], not: null }
                },
                {
                    title: { in: searchResultsThatHasNoDoi.map(i => i.title) },
                    date: { in: searchResultsThatHasNoDoi.map(i => i.date) }
                }
            ]
        }
    });

    const deduplicatedToCreate = [];
    const searchResults_DeduplicatedToCreate = [];
    const deduplicatedToUpdate = [];


    for (item of searchResults) {
        // check if dedup is found using doi or title and date
        let dedup = deduplicated.find(d =>
            (!item.doi && item.doi != "" && d.doi == item.doi) ||
            (d.title == item.title && d.date == item.date)
        );
        // if the dedup is found, update the dedup
        if (dedup) {
            searchResults_DeduplicatedToCreate.push({
                searchResultsId: item.id,
                deduplicatedId: dedup.id
            });
            deduplicatedToUpdate.push({
                where: { id: dedup.id },
                data: {
                    id: dedup.id,
                    item_ids: { push: item?.identifierInSource.toString() },
                    number_of_sources: { increment: 1 },
                    average_rank: dedup.average_rank + (item.itemPositionWithinSearch - dedup.average_rank) / (dedup.number_of_sources + 1)
                }
            });
        }
        // if dedup is not found, create a new dedup
        else {
            const newDedup = {
                id: uuid.v4(),
                title: item?.title,
                abstract: item?.abstract,
                keywords: item?.keywords,
                doi: item?.doi,
                date: item?.date,
                otherIdentifier: item?.identifierInSource,
                flag: null,
                item_ids: [item?.identifierInSource.toString()],
                number_of_sources: 1,
                average_rank: item?.itemPositionWithinSearch
            };

            deduplicatedToCreate.push(newDedup);
            searchResults_DeduplicatedToCreate.push({
                searchResultsId: item.id,
                deduplicatedId: newDedup.id
            });
            deduplicated.push(newDedup);
        }
    }

    const updateTransactions = deduplicatedToUpdate.map(item => prisma.deduplicated.update(item));
    const transactions = [
        deduplicatedToCreate.length > 0 ? prisma.deduplicated.createMany({ data: deduplicatedToCreate }) : null,
        searchResults_DeduplicatedToCreate.length > 0 ? prisma.searchResults_Deduplicated.createMany({ data: searchResults_DeduplicatedToCreate }) : null,
        ...updateTransactions
    ].filter(Boolean)
    await prisma.$transaction(transactions);
}

module.exports = { deduplicate }
