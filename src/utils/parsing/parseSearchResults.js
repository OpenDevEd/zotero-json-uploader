const { parseExtraToObj } = require('./parseExtraToObj');

function parseSearchResults(searchResults, data) {
  if (!searchResults || searchResults.length === 0) throw new Error('No search results to parse');
  return searchResults.map((result, idx) => {
    const extra = parseExtraToObj(result?.extra);
    return {
      title: result?.title ?? '',
      abstract: result?.abstractNote ?? '',
      keywords: extra?.keywords?.split(', ').join(';') ?? '',
      doi: result?.DOI ?? '',
      sourceDatabase: data.sourceDatabase,
      identifierInSource: extra?.id ?? '',
      originalJson: JSON.stringify(result),
      itemPositionWithinSearch: idx,
    };
  });
}

module.exports = {
  parseSearchResults,
};
