function parseExtraToObj(input) {
  // Regular expression to match key-value pairs
  const regex = /^(\w+):\s*(.*)$/gm;
  const result = {};
  let match;

  // Iterate over all matches in the input string
  while ((match = regex.exec(input)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2];
    result[key] = value;
  }

  return result;
}

module.exports = { parseExtraToObj };
