const dbDump = (yargs) => {
    yargs.option('table', {
        alias: '-t',
        describe: 'Table to dump',
        type: 'string',
        demandOption: true,
    });
    yargs.option('output', {
        alias: '-o',
        describe: 'Output file',
        type: 'string',
        demandOption: true,
    }).option('unscreened', {
        alias: '-u',
        describe: 'Retrieve unscreened data',
        type: 'boolean',
        default: false,
    })
}

module.exports = { dbDump }