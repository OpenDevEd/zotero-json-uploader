const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Uploads search results to the database.
 *
 * @param {Array} searchResults - The array of search results to upload.
 * @throws {Error} - If there are no search results to upload or an error occurs during the upload process.
 */
async function uploadSearchResults({ meta, results }) {
  try {
    if (results?.length === 0) throw new Error('No search results to upload');
    console.log(`\nIn progress...`);
    // check if the meta.searchID already exists in the database
    const search = await prisma.searchResults.findFirst({
      where: { searchId: meta.searchID },
      select: { searchId: true }
    });
    if (search === null) {
      // create a new search results
      const createdSearchResults = await prisma.searchResults.createMany({
        data: results,
      });
      console.log(`\n${createdSearchResults.count} Items uploaded to the database.`);
      return;
    }
    console.log(`\nSearch ID already exists in the database.`);

  } catch (error) {
    throw new Error(error);
  }
}

// async function createManyItems(dataArray) {
//   try {
//     // filter the duplicates in dataArray 
//     dataArray = dataArray.filter((item, index, self) => {
//       process.stdout.write("\r" + 'Checking item ' + (index + 1));
//       return index === self.findIndex((t) => {
//         if (item.doi === "")
//           return t.title === item.title && t.abstract === item.abstract
//         else
//           return t.doi === item.doi
//       })
//     });
//     process.stdout.write("\n" + 'Total unique items: ' + dataArray.length + "\n");

//     // Filter out items with DOIs that already exist in the database
//     console.log('Checking for existing items...');
//     const existingDois = await getExistingDoi(dataArray);
//     let newItems = dataArray.filter(item =>
//       !existingDois.includes(item.doi)
//     );
//     if (newItems.length === 0) {
//       console.log('\nNo new items to upload.');
//       return;
//     }

//     // using title and abstract to filter out existing items
//     const existingTitlesAndAbstracts = await getExistingTitlesAndAbstracts(dataArray);
//     newItems = newItems.filter(item =>
//       !existingTitlesAndAbstracts.some(existingItem =>
//         existingItem.title === item.title && existingItem.abstract === item.abstract
//       )
//     );
//     if (newItems.length === 0) {
//       console.log('\nNo new items to insert.');
//       return;
//     }

//     // Insert the filtered list of new items
//     console.log('\nCreating new items in the database...');
//     const createdItems = await prisma.searchResults.createMany({
//       data: newItems,
//     });

//     const createdItemsLength = createdItems.count;
//     const skippedItemsLength = dataArray.length - createdItemsLength;
//     console.log(`\n${createdItemsLength} Items uploaded to the database.`, skippedItemsLength > 0 ? `${skippedItemsLength} items skipped.` : '');
//   } catch (error) {
//     console.log('\nError creating items:', error);
//     console.error('\nError creating items:', error.message);
//     throw error;
//   }
// }

// async function getExistingTitlesAndAbstracts(dataArray) {
//   const inputTitles = dataArray.map(item => item.title)
//   const inputAbstracts = dataArray.map(item => item.abstract)

//   const res = await prisma.searchResults.findMany({
//     where: {
//       AND: [
//         { title: { in: inputTitles } },
//         { abstract: { in: inputAbstracts } },
//         { doi: "" }
//       ]
//     },
//     select: { title: true, abstract: true }
//   });
//   if (!res) throw new Error('Error getting existing titles and abstracts');
//   return res;
// }

// async function getExistingDoi(dataArray) {
//   const inputDois = dataArray.map(item => item.doi != "" ? item.doi : null).filter(Boolean);
//   const existingItems = await prisma.searchResults.findMany({
//     where: { doi: { in: inputDois } },
//     select: { doi: true },
//   });
//   if (!existingItems) throw new Error('Error getting existing DOIs');
//   return existingItems.map(item => item.doi);
// }

module.exports = { uploadSearchResults };
