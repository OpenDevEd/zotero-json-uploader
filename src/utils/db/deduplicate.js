const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();


async function deduplicate() {
    try {
        console.log('Cleaning up...');
        // clean up the deduplicated many-to-many table
        await prisma.searchResults_Deduplicated.deleteMany({
            where: {
                OR: [
                    { deduplicatedId: { equals: null } },
                    { searchResultsId: { equals: null } },
                ],
            }
        });

        const duplicatesDoiCount = await deduplicate_DOI();
        const duplicatesTitleAndDateCount = await deduplicateTitleAndDate()

        if (!duplicatesDoiCount && !duplicatesTitleAndDateCount) {
            console.log('No duplicates found.');
        } else {
            console.log('Deduplication complete.');
            console.log(`\nTotal duplicates: ${duplicatesDoiCount + duplicatesTitleAndDateCount}`);
        }
    } catch (error) {
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

async function deduplicate_DOI() {
    console.log('Checking for duplicates using [DOI]...');
    const total = {
        linked: 0,
        created: 0,
    }
    // get all the searchResults with DOI
    const duplicates = await prisma.searchResults.findMany({
        where: { doi: { not: "", }, SearchResults_Deduplicated: { none: {} } },
    });
    const duplicatesCount = duplicates.length;

    if (duplicatesCount !== 0) { // If there are duplicates
        console.log(`Total duplicates [DOI]: ${duplicatesCount}`);

        // Group the duplicates by doi {doi: [searchResults]}
        const grouped = duplicates.reduce((acc, item) => {
            if (!acc[item.doi]) acc[item.doi] = [];
            acc[item.doi].push(item);
            return acc;
        }, {});


        const dois = Object.keys(grouped);
        const toLink = await getDeduplicatedInList(dois, 'doi');
        const toCreate = dois.filter(doi =>
            !toLink.map(i => i.doi).includes(doi)
        );

        if (toCreate.length) {
            const data = toCreate.map(doi => {
                const item = grouped[doi][0];
                return {
                    abstract: item.abstract,
                    doi: item.doi,
                    flag: item.flag,
                    keywords: item.keywords,
                    otherIdentifier: item.identifierInSource,
                    title: item.title,
                    date: item.date,
                }
            })
            const [_, creatededuplicated] = await prisma.$transaction([
                prisma.deduplicated.createMany({ data }),
                prisma.deduplicated.findMany({ where: { doi: { in: toCreate } }, })
            ])
            await prisma.searchResults_Deduplicated.createMany({
                data: generateRelations(creatededuplicated, grouped)
            })
            total.created = creatededuplicated.count;
        }

        if (toLink.length) {
            const linked = await prisma.searchResults_Deduplicated.createMany({
                data: generateRelations(toLink, grouped)
            })
            total.linked = linked.count;
        }
    }

    return total.linked + total.created;
}

async function deduplicateTitleAndDate() {

    console.log('Checking for duplicates using [Title + Date]...');
    const total = { linked: 0, created: 0 };
    // get all the searchResults with DOI
    const duplicates = await prisma.searchResults.findMany({
        where: { SearchResults_Deduplicated: { none: {} }, title: { not: "", }, date: { not: null } },
    });
    const duplicatesCount = duplicates.length;

    if (duplicatesCount !== 0) { // If there are duplicates
        console.log(`Total duplicates [Title + Date]: ${duplicatesCount}`);

        // Group the duplicates by doi {doi: [searchResults]}
        const grouped = duplicates.reduce((acc, item) => {
            const key = `${item.title}(<|>)${item.date}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        const keys = Object.keys(grouped);
        const toLinkList = await getDeduplicatedInList(keys, 'titleAndDate');
        const toLink = toLinkList.map(i => `${i.title}(<|>)${i.date}`); // only the keys
        const toCreate = keys.filter(key => !toLink.includes(key));

        if (toCreate.length) {
            const data = toCreate.map(id => {
                const item = grouped[id][0];
                return {
                    abstract: item.abstract,
                    doi: item.doi,
                    flag: item.flag,
                    keywords: item.keywords,
                    otherIdentifier: item.identifierInSource,
                    title: item.title,
                    date: item.date,
                }
            })

            const created = await prisma.deduplicated.createMany({ data });
            if (!created) {
                console.log('Error creating deduplicated entries.');
                process.exit(1);
            }
            const getdedups = await getDeduplicatedInList(toCreate, 'titleAndDate');
            await prisma.searchResults_Deduplicated.createMany({
                data: generateRelations(getdedups, grouped, 'useTitleAndDate')
            })
            total.created = created.count;
        }

        if (toLink.length) {
            const linked = await prisma.searchResults_Deduplicated.createMany({
                data: generateRelations(toLinkList, grouped, 'useTitleAndDate')
            })
            total.linked = linked.count;
        }
    }
    return total.linked + total.created;
}

async function getDeduplicatedInList(list, distinct) {
    if (typeof list !== 'object') throw new Error('getDoisInDeduplicated: param datatype is not expected.')
    if (distinct === 'doi') {
        const doisArray = await prisma.deduplicated.findMany({
            where: { doi: { in: list } },
        });

        return doisArray
    }
    if (distinct === 'titleAndDate') {
        const listArray = list.map(item => {
            const [title, date] = item.split('(<|>)');
            return { title, date };
        });

        const itemsArray = await prisma.deduplicated.findMany({
            where: {
                OR: [
                    { title: { in: listArray.map(i => i.title) } },
                    { date: { in: listArray.map(i => i.date) } }
                ]
            },
        });
        return itemsArray
    }
}

function generateRelations(deduplicated, searchResults, usingTitleAndDate = false) {
    const result = [];
    // Iterate through each deduplicated entry
    deduplicated.forEach(dedup => {
        const key = usingTitleAndDate ? `${dedup.title}(<|>)${dedup.date}` : dedup.doi;
        // Check if there are searchResults for the given DOI
        if (searchResults[key]) {
            // Map the searchResults to the result format
            const mappedResults = searchResults[key].map(sr => ({
                deduplicatedId: dedup.id,
                searchResultsId: sr.id,
            }));
            // Add the mapped results to the result array
            result.push(...mappedResults);
        }
    });
    return result;
}

module.exports = { deduplicate }