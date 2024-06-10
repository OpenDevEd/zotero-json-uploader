const dbSetConnection = (yargs) => {
    yargs.positional('url', {
        describe: 'Database URL',
        type: 'string',
        array: true,
    })
}

module.exports = { dbSetConnection }