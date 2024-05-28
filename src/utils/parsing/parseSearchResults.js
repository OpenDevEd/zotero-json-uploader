const { parseExtraToObj } = require('./parseExtraToObj');

function parseSearchResults(data) {
  const { results, meta } = JSON.parse(data);
  if (!results || results?.length === 0) throw new Error('No search results to parse');
  if (!meta) throw new Error('No metadata found');
  return {
    meta: meta,
    results: results.map((result, idx) => {
      const extra = parseExtraToObj(result?.extra);
      return {
        title: result?.title ?? '',
        abstract: result?.abstractNote ?? '',
        keywords: extra?.keywords?.split(', ').filter(Boolean).join(';') ?? '',
        doi: result?.DOI ?? '',
        sourceDatabase: meta?.source ?? '',
        identifierInSource: extra?.id ?? '',
        originalJson: JSON.stringify(result),
        itemPositionWithinSearch: idx,
        searchId: meta?.searchID ?? '',
      };
    })
  }
}

module.exports = {
  parseSearchResults,
};
