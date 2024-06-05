const path = require('path');
const defaultPath = path.join(__dirname, '../../../');
const fs = require('fs');
const jq = require('node-jq');

async function parseSearchResults(data) {
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
