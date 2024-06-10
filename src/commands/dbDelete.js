const dbDelete = (yargs) => {
    yargs.positional('searchId', {
        alias: '-s',
        describe: 'Search ID',
        type: 'string',
        array: true,
    })
}

module.exports = { dbDelete }