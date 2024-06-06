const { PrismaClient } = require('@prisma/client');
const { select } = require('@inquirer/prompts');
const prisma = new PrismaClient();

async function deleteSearch(searchId) {
    try {
        const confirm = await select({
            message: `Are you sure you want to delete search results and deduplicated data for search ID: ${searchId}?`,
            choices: [
                { value: true, name: '- Yes' },
                { value: false, name: '- No' },
            ],
        });
        if (!confirm) {
            console.log('Search deletion cancelled.');
            return;
        }

        const res = await prisma.$transaction([
            prisma.searchResults.deleteMany({
                where: { searchId: searchId }
            }),
            prisma.searchResults_Deduplicated.deleteMany({
                where: {
                    OR: [
                        { deduplicatedId: { equals: null } },
                        { searchResultsId: { equals: null } },
                    ],
                }
            }),
            prisma.deduplicated.deleteMany({
                where: { SearchResults_Deduplicated: { none: {} } }
            }),
        ]);
        console.log('Search results deleted:', res[0].count);
        console.log('Deduplicated deleted:', res[2].count);
    } catch (error) {
        console.error(error.message || 'An error occurred while deleting search results.');
        process.exit(1);
    }
}

module.exports = { deleteSearch };

