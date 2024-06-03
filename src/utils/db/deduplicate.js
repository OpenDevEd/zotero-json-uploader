const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


async function deduplicate() {

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
    const duplicatesIdentifierCount = await deduplicate_identifier();

    if (!duplicatesDoiCount && !duplicatesIdentifierCount) {
        console.log('No duplicates found.');
    } else {
        console.log('Deduplication complete.');
        console.log(`\nTotal duplicates: ${duplicatesDoiCount + duplicatesIdentifierCount}`);
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
                }
            })
            const [_, creatededuplicated] = await prisma.$transaction([
                prisma.deduplicated.createMany({ data }),
                prisma.deduplicated.findMany({ where: { doi: { in: toCreate } }, })
            ])
            const createRelationRes = await prisma.searchResults_Deduplicated.createMany({
                data: generateRelations(creatededuplicated, grouped)
            })
            total.created = createRelationRes.count;
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

async function deduplicate_identifier() {
    console.log('Checking for duplicates using [identifiers]...');
    const total = { linked: 0, created: 0 }
    // get all the searchResults with DOI
    const duplicates = await prisma.searchResults.findMany({
        where: { doi: "", SearchResults_Deduplicated: { none: {} } },
    });
    const duplicatesCount = duplicates.length;

    if (duplicatesCount !== 0) { // If there are duplicates
        console.log(`Total duplicates [identifier]: ${duplicatesCount}`);

        // Group the duplicates by doi {doi: [searchResults]}
        const grouped = duplicates.reduce((acc, item) => {
            if (!acc[item.identifierInSource]) acc[item.identifierInSource] = [];
            acc[item.identifierInSource].push(item);
            return acc;
        }, {});


        const identifiers = Object.keys(grouped);
        const toLink = await getDeduplicatedInList(identifiers, 'otherIdentifier');
        const toCreate = identifiers.filter(identifier =>
            !toLink.map(i => i.otherIdentifier).includes(identifier)
        );

        if (toCreate.length) {
            const data = toCreate.map(identifier => {
                const item = grouped[identifier][0];
                return {
                    abstract: item.abstract,
                    doi: item.doi,
                    flag: item.flag,
                    keywords: item.keywords,
                    otherIdentifier: item.identifierInSource,
                    title: item.title,
                }
            })
            const [_, creatededuplicated] = await prisma.$transaction([
                prisma.deduplicated.createMany({ data }),
                prisma.deduplicated.findMany({ where: { otherIdentifier: { in: toCreate } }, })
            ])
            const createRelationRes = await prisma.searchResults_Deduplicated.createMany({
                data: generateRelationsUsingIdentifiers(creatededuplicated, grouped)
            })
            total.created = createRelationRes.count;
        }

        if (toLink.length) {
            const linked = await prisma.searchResults_Deduplicated.createMany({
                data: generateRelationsUsingIdentifiers(toLink, grouped)
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
        })
        return doisArray
    }
    if (distinct === 'otherIdentifier') {
        const doisArray = await prisma.deduplicated.findMany({
            where: { otherIdentifier: { in: list } },
        })
        return doisArray
    }
}

function generateRelations(deduplicated, searchResults) {
    const result = [];

    // Iterate through each deduplicated entry
    deduplicated.forEach(dedup => {
        const doi = dedup.doi;

        // Check if there are searchResults for the given DOI
        if (searchResults[doi]) {
            // Map the searchResults to the result format
            const mappedResults = searchResults[doi].map(sr => ({
                deduplicatedId: dedup.id,
                searchResultsId: sr.id,
            }));
            // Add the mapped results to the result array
            result.push(...mappedResults);
        }
    });
    return result;
}

function generateRelationsUsingIdentifiers(deduplicated, searchResults) {
    const result = [];

    // Iterate through each deduplicated entry
    deduplicated.forEach(dedup => {
        const identifier = dedup.otherIdentifier;

        // Check if there are searchResults for the given DOI
        if (searchResults[identifier]) {
            // Map the searchResults to the result format
            const mappedResults = searchResults[identifier].map(sr => ({
                deduplicatedId: dedup.id,
                searchResultsId: sr.id,
            }));
            // Add the mapped results to the result array
            result.push(...mappedResults);
        }
    });
    return result;
}

module.exports = {
    deduplicate
}