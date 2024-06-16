const dbUploadScreening = (yargs) => {
    yargs.option('files', {
        alias: 'f',
        describe: 'File to upload',
        type: 'string',
        demandOption: true,
    })
}

module.exports = { dbUploadScreening }