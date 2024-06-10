const dbUpload = (yargs) => {
    yargs.option('transform', {
        alias: 't',
        describe: 'Chose the transformation to apply to the data. For the option jq, you need to provide a jq file if -j',
        choices: [
            'jq',
            'openalexjq',
            'openalexjs-sdgs',
            'openalexjs',
            'scholarlyjq',
            'openalexjq-sdgs',
            'scopusjq',
        ]
    }).positional('files', {
        describe: 'One or more files',
        type: 'string',
        array: true,
    })
}

module.exports = { dbUpload }