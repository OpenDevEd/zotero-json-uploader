const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


async function deduplicate() {

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
    const duplicates = await prisma.searchResults.findMany({
        where: { doi: { not: "" }, duplicateChecked: false },
    });
    const duplicatesCount = duplicates.length;

    if (duplicatesCount !== 0) {
        console.log('Total duplicates using [DOI]: ' + duplicatesCount);

        // group the duplicates by doi
        const grouped = duplicates.reduce((acc, item) => {
            if (!acc[item.doi]) {
                acc[item.doi] = [];
            }
            acc[item.doi].push(item);
            return acc;
        }, {});

        const alreadyExistAsDeduplicated = await getDeduplicatedInList(Object.keys(grouped), 'doi');
        const alreadyExistAsDeduplicatedDois = alreadyExistAsDeduplicated.map(i => i.doi);
        const toLink = Object.keys(grouped).filter(doi => alreadyExistAsDeduplicatedDois.includes(doi));

        const res = await prisma.$transaction([
            prisma.deduplicated.deleteMany({
                where: { doi: { in: toLink } }
            }),
            prisma.deduplicated.createMany({
                data: Object.values(grouped).map(items => {
                    if (toLink.includes(items[0].doi)) {
                        const item = alreadyExistAsDeduplicated.find(i => i.doi === items[0].doi);
                        return {
                            abstract: item.abstract,
                            doi: item.doi,
                            flag: item.flag,
                            keywords: item.keywords,
                            otherIdentifier: item.otherIdentifier,
                            title: item.title,
                            searchResultsIds: [...items.map(i => i.id), ...item.searchResultsIds]
                        }
                    }
                    return {
                        abstract: items[0].abstract,
                        doi: items[0].doi,
                        flag: items[0].flag,
                        keywords: items[0].keywords,
                        otherIdentifier: items[0].otherIdentifier,
                        title: items[0].title,
                        searchResultsIds: items.map(i => i.id)
                    }
                })
            }),
            prisma.searchResults.updateMany({
                where: { doi: { not: "" }, duplicateChecked: false },
                data: { duplicateChecked: true }
            })
        ]);
        console.log(res[1].count + ' items deduplicated.');
        return res[1]?.count || 0;
    }
}

async function deduplicate_identifier() {
    console.log('Checking for duplicates using [identifier]...');
    const duplicates2 = await prisma.searchResults.findMany({
        where: { doi: "", duplicateChecked: false, identifierInSource: { not: "" } },
    });
    const duplicatesCount2 = duplicates2.length;

    if (duplicatesCount2 !== 0) {
        console.log('Total duplicates using [identifier]: ' + duplicatesCount2);

        // group the duplicates by identifier
        const grouped2 = duplicates2.reduce((acc, item) => {
            if (!acc[item.identifierInSource]) {
                acc[item.identifierInSource] = [];
            }
            acc[item.identifierInSource].push(item);
            return acc;
        }, {});

        const alreadyExistAsDeduplicated = await getDeduplicatedInList(Object.keys(grouped2), 'otherIdentifier');
        const alreadyExistAsDeduplicatedDois = alreadyExistAsDeduplicated.map(i => i.otherIdentifier);
        const toLink = Object.keys(grouped2).filter(otherIdentifier => alreadyExistAsDeduplicatedDois.includes(otherIdentifier));


        const res = await prisma.$transaction([
            prisma.deduplicated.deleteMany({
                where: { otherIdentifier: { in: toLink } }
            }),
            prisma.deduplicated.createMany({
                data: Object.values(grouped2).map(items => {
                    if (toLink.includes(items[0].identifierInSource)) {
                        const item = alreadyExistAsDeduplicated.find(i => i.otherIdentifier === items[0].identifierInSource);
                        return {
                            abstract: item.abstract,
                            doi: item.doi,
                            flag: item.flag,
                            keywords: item.keywords,
                            otherIdentifier: item.otherIdentifier,
                            title: item.title,
                            searchResultsIds: [...items.map(i => i.id), ...item.searchResultsIds]
                        }
                    }
                    return {
                        abstract: items[0].abstract,
                        doi: items[0].doi,
                        flag: items[0].flag,
                        keywords: items[0].keywords,
                        otherIdentifier: items[0].identifierInSource,
                        title: items[0].title,
                        searchResultsIds: items.map(i => i.id)
                    }
                })
            }),
            prisma.searchResults.updateMany({
                where: { doi: "", duplicateChecked: false, identifierInSource: { not: "" } },
                data: { duplicateChecked: true }
            })
        ]);
        console.log(res[1].count + ' items deduplicated.');
        return res[1]?.count || 0;
    }
}

module.exports = {
    deduplicate
}

async function getDeduplicatedInList(list, distinct) {
    if (typeof list !== 'object') throw new Error('getDoisInDeduplicated: param datatype is not expected.')
    if (distinct === 'doi') {
        const doisArray = await prisma.deduplicated.findMany({
            where: { doi: { in: list } },
            distinct: ['doi'],
        })
        return doisArray
    }
    if (distinct === 'otherIdentifier') {
        const doisArray = await prisma.deduplicated.findMany({
            where: { otherIdentifier: { in: list } },
            distinct: ['otherIdentifier'],
        })
        return doisArray
    }
}

