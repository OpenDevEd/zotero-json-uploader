const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function status() {
  // searchResultsLength
  const searchResultsLength = await prisma.searchResults.count();

  // searchResultsLength with no duplicates
  const searchResultsLengthWithNoDuplicates = await prisma.searchResults.count({
    where: { SearchResults_Deduplicated: { none: {} } },
  });

  const searchResultsDeduplicatedLength = await prisma.deduplicated.count({
    where: { number_of_sources: { gt: 1 } },
  });
  const duplicateDOIs = await prisma.searchResults.groupBy({
    by: ['doi'],
    having: {
      doi: {
        _count: {
          gt: 1,
        },
        not: {
          equals: '',
        },
      },
    },
    _count: {
      doi: true,
    },
  });
  // const tables =
  //   await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='searchtrailstest'`;

  // console.log(tables);
  const duplicateTitleDates = await prisma.$queryRaw`
    SELECT LOWER(TRIM(title)) as title, SUBSTRING(date, 1, 4) as year, COUNT(*) as count
    FROM "searchtrailstest"."SearchResults"
    GROUP BY LOWER(TRIM(title)), SUBSTRING(date, 1, 4)
    HAVING COUNT(*) > 1
  `;

  // console.log(duplicateTitleDates);
  const similarityThreshold = 0.9; // Adjust the threshold as needed
  const similarTitles = await findSimilarTitles(similarityThreshold);

  console.log(
    `Number of similar title pairs found: ${similarTitles.length}`.green
  );
  const deduplicatedLength = await prisma.deduplicated.count();
  console.log(`Total search results: ${searchResultsLength}`);
  console.log(
    `Search results with no duplicates: ${searchResultsLengthWithNoDuplicates}`
  );
  console.log(`Total deduplicated: ${deduplicatedLength}`);
  console.log(
    `Total search results deduplicated: ${searchResultsDeduplicatedLength}`
  );
}
async function statusV2() {
  // number of elements in searchResults
  const searchResultsLength = await prisma.searchResults.count();
  // number of elements in deduplicated
  const deduplicatedLength = await prisma.deduplicated.count();
  // number of elements in deduplicated that have doi
  const deduplicatedWithDOI = await prisma.deduplicated.count({
    where: { doi: { not: null } },
  });
  // number of elements in deduplicated does not have abstract
  const deduplicatedWithoutAbstract = await prisma.deduplicated.count({
    where: { abstract: { equals: null } },
  });
  // Histogram of how many items have x sources ( x % → 1 source, y % → 2 sources)
  const sourcesHistogram = await prisma.deduplicated.groupBy({
    by: ['number_of_sources'],
    _count: { number_of_sources: true },
  });
  console.log(`Total items in table 1: ${searchResultsLength}`);
  console.log(`Total items in table 2: ${deduplicatedLength}`);
  const percentageWithDOI = (deduplicatedWithDOI / deduplicatedLength) * 100;
  console.log(`Number in Table 2 that have a DOI (%) : ${percentageWithDOI}`);
  const percentageWithoutAbstract =
    (deduplicatedWithoutAbstract / deduplicatedLength) * 100;
  console.log(
    `Number in Table 2 that have no abstract (%) : ${percentageWithoutAbstract}`
  );
  console.log(
    `Histogram of number of sources: ${JSON.stringify(
      sourcesHistogram,
      null,
      2
    )}`
  );
}
async function findSimilarTitles(threshold) {
  const similarTitles = await prisma.$queryRaw`
      SELECT sr1.id, sr2.id as match_id, similarity(sr1.title::text, sr2.title::text) as similarity
    FROM "searchtrailstest"."SearchResults" sr1, "searchtrailstest"."SearchResults" sr2
    WHERE sr1.id <> sr2.id AND similarity(sr1.title::text, sr2.title::text) > ${threshold}
    ORDER BY similarity DESC;
  `;
  return similarTitles;
}
module.exports = { status, statusV2 };
