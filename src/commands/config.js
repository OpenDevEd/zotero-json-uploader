const config = (yargs) => {
    yargs.option('set', {
        alias: '-s',
        describe: 'Set the configuration',
        type: 'string',
        demandOption: true,
    });
}

module.exports = { config }