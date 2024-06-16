const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const jq = require('node-jq');
const defaultPath = path.join(__dirname, '../../../');
const { confirm } = require('@inquirer/prompts');
const colors = require('colors')

async function dbUploadScreening(file) {
    const pathFile = path.join(defaultPath, file);
    const jqFilter = `[ .[] | {
                "deduplicatedId": .meta.data.id,
                "screening": {
                    "resultOfScreening": .,
                    "screeningUUID": .meta.screening_uuid,
                    "deduplicatedId": .meta.data.id
                },
                "screeningInformation": {
                    "screeningUUID": .meta.screening_uuid,
                    "screeningInfo": .meta
                },
            }] | {
                listDeduplicatedId: [ .[] | .deduplicatedId ],
                listScreening: [ .[] | .screening ],
                listScreeningInformation: [ .[] | .screeningInformation ]
            } `;
    try {
        var filterData = await jq.run(jqFilter, pathFile, { input: 'file', output: 'json' });

    } catch (error) {
        console.error(`An error occurred while reading the file: ${error}`.red);
        process.exit(1);
    };

    const screening = filterData.listScreening;
    const deduplicatedIds = filterData.listDeduplicatedId;
    const screeningInformation = filterData.listScreeningInformation;

    try {
        const res = await prisma.$transaction([
            prisma.screening.createMany({
                data: screening
            }),
            prisma.screening.findMany({
                where: { deduplicatedId: { in: deduplicatedIds } }
            })
        ]);
        const screeningThatHasBeenCreated = res[1];

        // assign the id of screening to screeningInformation (screeningId)
        const screeningInformationList = screeningInformation.map(element => {
            const screening = screeningThatHasBeenCreated.find(screening =>
                screening.deduplicatedId === element.screeningInfo.data.id
            );
            element.screeningId = screening.id;
            return element;
        });
        const res2 = await prisma.screeningInformation.createMany({
            data: screeningInformationList
        });
        console.log(`${res2.count} screening information have been created.`);

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error('An error occurred...'.red);
            // Handle known errors
            if (error.code === 'P2002') {
                if (error.meta.target.includes('deduplicatedId')) {
                    // get the deduplicatedId that already exists
                    await handleSomeDeduplicatesHasScreening(deduplicatedIds, file);
                }
            }
            // Add more known error codes as needed
        } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            console.error('An unknown error occurred:', error.message);
        } else if (error instanceof Prisma.PrismaClientRustPanicError) {
            console.error('A Rust panic occurred:', error.message);
        } else if (error instanceof Prisma.PrismaClientInitializationError) {
            console.error('Prisma Client initialization error:', error.message);
        } else {
            console.error('An unexpected error occurred:', error);
        }
    }
}

async function handleSomeDeduplicatesHasScreening(deduplicatedIds, file) {
    const deduplicatedIdsThatisExist = await prisma.deduplicated.findMany({
        where: { id: { in: deduplicatedIds, }, screening: { isNot: null } }
    });

    deduplicatedIdsThatisExist.map(element => {
        console.log('Deduplicated item with id:', element.id, 'already has a screening.');
    });
    try {
        var replace = await confirm({ message: 'Do you want to replace the existing screening?' })
    } catch (error) {
        console.error('\n' + error.message.yellow);
        process.exit(1);
    }
    if (replace) {
        const getAll = await prisma.screening.findMany({
            where: { deduplicatedId: { in: deduplicatedIds } },
            include: { ScreeningInformation: true }
        });

        const screeningInformation = prisma.screeningInformation.deleteMany({
            where: { screeningId: { in: getAll.map(element => element.id) } }
        });

        const screening = prisma.screening.deleteMany({
            where: { deduplicatedId: { in: deduplicatedIds } }
        });

        const res = await prisma.$transaction([screeningInformation, screening]);
        console.log(`${res[0].count} screening information have been deleted.`);
        console.log(`${res[1].count} screening have been deleted.`);

        if (res[0].count === 0 && res[1].count === 0) {
            console.log('No screening information and screening have been deleted.');
        } else {
            dbUploadScreening(file);
        }
    }
}

module.exports = { dbUploadScreening };