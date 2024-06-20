const { default: OpenAlex } = require('openalex-sdk');
const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');
async function openAlexOneItem(item) {
  // search for items by title first 30 characters and abstract if available
  const openAlex = new OpenAlex();
  const originalJson = JSON.parse(item.originalJson);

  // if item has valid year
  const date = item.date;
  const year = date !== 'NA' ? date.substring(0, 4) : undefined;
  console.log(year);
  return item;
  const searchOption = year
    ? {
        search: item.title,
        filter: {
          publication_year: [year - 1, year, year + 1],
        },
      }
    : { search: item.title };
  const searchResults = await openAlex.works(searchOption);
  // filter by title and abstract
  let filtered = searchResults.results.filter(
    (result) =>
      (result.title &&
        result.title.toLowerCase().includes(item.title.toLowerCase())) ||
      (result.abstract &&
        result.abstract.toLowerCase().includes(item.abstract.toLowerCase()))
  );
  // filter by author last name
  const authorsMap = originalJson.creators;

  filtered = filtered.filter((result) => {
    return result.authorships.some((authorship) =>
      authorsMap.some((author) => {
        if (author.lastName) {
          return authorship.author.display_name
            .toLowerCase()
            .includes(author.lastName.toLowerCase());
        }
        return false;
      })
    );
  });
  return filtered;
}

async function OpenAlexMatch() {
  const prisma = new PrismaClient();
  let noResult = 0;
  // find first record in searchResults and source from Google Scholar
  const sample = await prisma.searchResults.findMany({
    where: {
      sourceDatabase: 'Google Scholar',
    },
    take: 100,
  });
  let results = [];
  for (let item of sample) {
    const openAlexResults = await openAlexOneItem(item);
    if (openAlexResults.length > 0) {
      // add the result and item
      const result = {
        openAlexResult: openAlexResults[0],
        item,
      };
      results.push(result);
    }

    // if more than 1 result print to console
    if (openAlexResults.length > 1) {
      console.log(`more than 1 result for ${item.title}`);
    }
    if (openAlexResults.length == 0) {
      console.log(`no results for ${item.title}`);
      noResult++;
    }
    // save to json
    await fs.writeFileSync(
      'openalex-results.json',
      JSON.stringify(results, null, 2)
    );
  }
}

module.exports = { OpenAlexMatch };
