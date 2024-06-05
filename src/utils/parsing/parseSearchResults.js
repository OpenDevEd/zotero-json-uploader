// const { parseExtraToObj } = require('./parseExtraToObj');
const path = require('path');
const fs = require('fs');
const defaultPath = path.join(__dirname, '../../../');
const jq = require('node-jq');

async function parseSearchResults(data) {
  // const { results, meta } = JSON.parse(data);
  // if (!results || results?.length === 0) throw new Error('No search results to parse');
  // if (!meta) throw new Error('No metadata found');
  // return {
  //   meta: meta,
  //   results: results.map((result, idx) => {
  //     const extra = parseExtraToObj(result?.extra);
  //     return {
  //       title: result?.title ?? '',
  //       abstract: result?.abstractNote ?? '',
  //       keywords: extra?.keywords?.split(', ').filter(Boolean).join(';') ?? '',
  //       doi: result?.DOI ?? '',
  //       sourceDatabase: meta?.source ?? '',
  //       identifierInSource: result?.callNumber ?? '',
  //       originalJson: JSON.stringify(result),
  //       itemPositionWithinSearch: idx,
  //       searchId: meta?.searchID ?? '',
  //     };
  //   })
  // }

  try {
    const filterString = fs.readFileSync(defaultPath + '/jq/searchResultsParser.jq', 'utf8');
    const dataAfter = await jq.run(filterString, JSON.parse(data), { input: 'json', output: 'pretty' });
    return JSON.parse(dataAfter);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = { parseSearchResults };
