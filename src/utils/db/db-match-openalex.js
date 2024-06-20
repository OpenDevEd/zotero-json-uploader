const { default: OpenAlex } = require('openalex-sdk');
const { PrismaClient, Prisma } = require('@prisma/client');
async function openAlexOneItem(item) {
  // search for items by title first 30 characters and abstract if available
  const openAlex = new OpenAlex();
  const originalJson = JSON.parse(item.originalJson);

  // if item has valid year
  const date = item.date;
  const year = date ? date.substring(0, 4) : null;
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
      result.title.toLowerCase().includes(item.title.toLowerCase()) ||
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
  console.log(filtered);
}

async function OpenAlexMatch() {
  const prisma = new PrismaClient();

  // find first record in searchResults and source from Google Scholar
  const sample = await prisma.searchResults.findFirst({
    where: {
      title: 'Teaching and learning mathematics with digital technologies',
    },
  });
  console.log(sample);
  await openAlexOneItem(sample);
}

module.exports = { OpenAlexMatch };
