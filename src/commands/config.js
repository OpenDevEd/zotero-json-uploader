const config = (yargs) => {
    yargs.option('set', {
        alias: 's',
        describe: 'Setup Zotero configuration or database configuration',
        choices: ['api-key', 'database'],
        demandOption: true,
    });
}

module.exports = { config }