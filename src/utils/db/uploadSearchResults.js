const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Uploads search results to the database.
 *
 * @param {Array} searchResults - The array of search results to upload.
 * @throws {Error} - If there are no search results to upload or an error occurs during the upload process.
 */
async function uploadSearchResults(searchResults) {
  try {
    if (!searchResults || searchResults.length === 0) throw new Error('No search results to upload');
   
    const createdSearchResults = await prisma.searchResults.createMany({
      data: searchResults
    });
    return createdSearchResults;
  } catch (error) {
    throw new Error(error);
  }
}


module.exports = { uploadSearchResults };
