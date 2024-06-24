const { default: OpenAlex } = require('openalex-sdk');
const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');
var stringSimilarity = require('string-similarity');
const { parseSearchResults } = require('../parsing/parseSearchResults');
const { openalexToZotero } = require('../openalex-to-zotero');
async function openAlexOneItem(item) {
  // search for items by title first 30 characters and abstract if available
  const openAlex = new OpenAlex();
  const originalJson = JSON.parse(item.originalJson);
  let oldTitle = item.title;
  // check if the title had , in it if so remove it
  if (item.title.includes('&')) {
    item.title = item.title.replace('&', '');
  }
  // if item has valid year
  const date = item.date;
  const year = date !== 'NA' ? parseInt(date.substring(0, 4)) : undefined;
  // convert year to number
  const searchOption =
    year >= 1970 || year <= new Date().getFullYear()
      ? {
          search: item.title,
          filter: {
            publication_year: [year - 1, year, year + 1],
          },
          AbstractArrayToString: true,
        }
      : { search: item.title, AbstractArrayToString: true };
  const searchResults = await openAlex.works(searchOption);
  item.title = oldTitle;
  // filter by title and abstract
  let filtered = searchResults.results.filter(
    (result) =>
      (result.title &&
        result.title.toLowerCase().includes(item.title.toLowerCase())) ||
      (result.abstract &&
        result.abstract.toLowerCase().includes(item.abstract.toLowerCase()))
  );
  if (filtered.length === 0) {
    console.log(`no results for part 1 ${item.title}`.red);
    filtered = searchResults.results;
  }
  // filter by author last name
  else if (filtered.length == 1)
    return {
      meta: searchResults.meta,
      results: filtered,
    };
  else if (filtered.length > 1)
    console.log(`more than 1 result in part 1 for ${item.title}`.red);

  const authorsMap = originalJson.creators;

  let filtered2 = filtered.filter((result) => {
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
  if (filtered2.length === 0) {
    console.log(`no results for part 2 ${item.title}`.red);
    filtered2 = filtered;
  } else if (filtered2.length == 1)
    return {
      meta: searchResults.meta,
      results: filtered2,
    };
  else if (filtered2.length > 1)
    console.log(`more than 1 result in part 2 for ${item.title}`.red);

  // filter by string similarity of title
  const filtered3 = filtered2.filter((result) => {
    return stringSimilarity.compareTwoStrings(result.title, item.title) > 0.85;
  });
  if (filtered3.length === 0) {
    console.log(`no results for part 3 ${item.title}`.red);
  }
  if (filtered3.length == 1)
    return {
      meta: searchResults.meta,
      results: filtered3,
    };
  else if (filtered3.length > 1)
    console.log(`more than 1 result in part 3 for ${item.title}`.red);
  return {
    meta: searchResults.meta,
    results: [],
  };
}

async function OpenAlexMatch() {
  const prisma = new PrismaClient();
  let noResult = 0;
  // find first record in searchResults and source from Google Scholar
  const sample = await prisma.searchResults.findMany({
    where: {
      sourceDatabase: 'Google Scholar',
      // id: '0f9d75a7-9880-4d31-9fbc-fbcdf66dc1c7',
    },
    take: 10,
  });
  let results = [];
  for (let item of sample) {
    const openAlexResults = await openAlexOneItem(item);

    if (openAlexResults.results.length > 0) {
      // add the result and item
      const result = {
        openAlexResult: openAlexResults.results,
        item,
      };
      results.push(result);
    }

    // if more than 1 result print to console
    else if (openAlexResults.results.length > 1) {
      console.log(`more than 1 result for ${item.title}`);
    } else if (openAlexResults.results.length == 0) {
      console.log(`no results for ${item.title}`);
      noResult++;
      const result2 = {
        openAlexResult: [],
        item,
      };
      results.push(result2);
    }
  }

  // save to json
  await fs.writeFileSync(
    'openalex-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log(`no results: ${noResult}`.red);
}

module.exports = { OpenAlexMatch };
