const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const colors = require('colors');
const fs = require('fs');
const uuid = require('uuid');

async function deduplicate() {
  // await prisma.deduplicated.deleteMany();
  // await prisma.searchResults_Deduplicated.deleteMany();
  // await prisma.searchResults.deleteMany();
  await deleteDeduplicated();
  await deduplicateSearchResultV6();
  // process.exit()
  // try {
  //   await deleteDeduplicated();
  //   console.log('Init deduplication process...'.yellow);

  //   const searchResultsLength = await prisma.searchResults.count({
  //     where: { SearchResults_Deduplicated: { none: {} } },
  //   });

  //   const chunkSize = 10000;
  //   let totalSearchResultsProcessed = 0;

  //   console.log(
  //     `Total search results to process: ${searchResultsLength}`.yellow
  //   );
  //   console.log('Processing duplicates...'.yellow);

  //   while (totalSearchResultsProcessed < searchResultsLength) {
  //     const duplicates = await prisma.searchResults.findMany({
  //       where: { SearchResults_Deduplicated: { none: {} } },
  //       skip: totalSearchResultsProcessed,
  //       take: chunkSize,
  //     });

  //     if (duplicates.length === 0) break;

  //     const duplicatesList = await findDuplicates();
  //     const existingDeduplicated = await getExistingDeduplicatedRecords(
  //       duplicatesList
  //     );
  //     const {
  //       deduplicatedToCreate,
  //       searchResults_DeduplicatedToCreate,
  //       deduplicatedToUpdate,
  //     } = await processDuplicates(duplicates, existingDeduplicated);

  //     const updateTransactions = deduplicatedToUpdate.map((item) =>
  //       prisma.deduplicated.update(item)
  //     );

  //     const transactions = [
  //       deduplicatedToCreate.length > 0
  //         ? prisma.deduplicated.createMany({ data: deduplicatedToCreate })
  //         : null,
  //       searchResults_DeduplicatedToCreate.length > 0
  //         ? prisma.searchResults_Deduplicated.createMany({
  //             data: searchResults_DeduplicatedToCreate,
  //           })
  //         : null,
  //       ...updateTransactions,
  //     ].filter(Boolean);

  //     await prisma.$transaction(transactions);

  //     totalSearchResultsProcessed += duplicates.length;
  //     process.stdout.write(
  //       `\rProcessed: ${totalSearchResultsProcessed}/${searchResultsLength}`
  //     );
  //   }

  //   console.log('\nDeduplication complete.'.green);
  // } catch (error) {
  //   console.log(error);
  //   if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //     console.error('An error occurred...'.red);
  //     // Handle known errors
  //     if (error.code === 'P2002') {
  //       console.log('Duplicate entry found:', error.meta.target);
  //     }
  //     // Add more known error codes as needed
  //   } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
  //     console.error('An unknown error occurred:', error.message);
  //   } else if (error instanceof Prisma.PrismaClientRustPanicError) {
  //     console.error('A Rust panic occurred:', error.message);
  //   } else if (error instanceof Prisma.PrismaClientInitializationError) {
  //     console.error('Prisma Client initialization error:', error.message);
  //   } else {
  //     console.error('An unexpected error occurred:', error);
  //   }
  // }
}

// increase the speed
async function deduplicateSearchResultV2(searchResults) {
  const { searchResultsThatHasDoi, searchResultsThatHasNoDoi } =
    searchResults.reduce(
      (acc, item) => {
        if (item.doi) acc.searchResultsThatHasDoi.push(item);
        else acc.searchResultsThatHasNoDoi.push(item);
        return acc;
      },
      { searchResultsThatHasDoi: [], searchResultsThatHasNoDoi: [] }
    );

  const deduplicated = await prisma.deduplicated.findMany({
    where: {
      OR: [
        {
          doi: {
            in: searchResultsThatHasDoi.map((i) => i.doi),
            notIn: [''],
            not: null,
          },
        },
        {
          title: { in: searchResultsThatHasNoDoi.map((i) => i.title) },
          //TODO: only compare the year
          date: { in: searchResultsThatHasNoDoi.map((i) => i.date) },
        },
      ],
    },
  });

  const deduplicatedToCreate = [];
  const searchResults_DeduplicatedToCreate = [];
  const deduplicatedToUpdate = [];

  for (item of searchResults) {
    // check if dedup is found using doi or title and date
    let dedup = deduplicated.find(
      (d) =>
        (!item.doi && item.doi != '' && d.doi == item.doi) ||
        (d.title == item.title && d.date == item.date)
    );
    // if the dedup is found, update the dedup
    if (dedup) {
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: dedup.id,
      });
      deduplicatedToUpdate.push({
        where: { id: dedup.id },
        data: {
          id: dedup.id,
          item_ids: { push: item?.identifierInSource.toString() },
          number_of_sources: { increment: 1 },
          average_rank: Math.floor(
            dedup.average_rank +
              (item.itemPositionWithinSearch - dedup.average_rank) /
                (dedup.number_of_sources + 1)
          ),
        },
      });
    }
    // if dedup is not found, create a new dedup
    else {
      const newDedup = {
        id: uuid.v4(),
        title: item?.title,
        abstract: item?.abstract,
        keywords: item?.keywords,
        doi: item?.doi,
        date: item?.date,
        otherIdentifier: item?.identifierInSource,
        flag: null,
        item_ids: [item?.identifierInSource.toString()],
        number_of_sources: 1,
        average_rank: item?.itemPositionWithinSearch,
      };

      deduplicatedToCreate.push(newDedup);
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: newDedup.id,
      });
      deduplicated.push(newDedup);
    }
  }

  const updateTransactions = deduplicatedToUpdate.map((item) =>
    prisma.deduplicated.update(item)
  );
  const transactions = [
    deduplicatedToCreate.length > 0
      ? prisma.deduplicated.createMany({ data: deduplicatedToCreate })
      : null,
    searchResults_DeduplicatedToCreate.length > 0
      ? prisma.searchResults_Deduplicated.createMany({
          data: searchResults_DeduplicatedToCreate,
        })
      : null,
    ...updateTransactions,
  ].filter(Boolean);
  await prisma.$transaction(transactions);
}
async function deduplicateSearchResultV3() {
  console.log('searching for duplicates in Title and Date...'.yellow);
  const duplicateTitleDates = await prisma.searchResults.groupBy({
    by: ['title', 'date'],
    having: {
      AND: [
        {
          title: {
            _count: {
              gt: 1,
            },
          },
        },
        {
          date: {
            _count: {
              gt: 1,
            },
          },
        },
      ],
    },
    _count: {
      _all: true,
    },
  });

  const titleDateDuplicates = await prisma.searchResults.findMany({
    where: {
      OR: duplicateTitleDates.map((d) => ({
        title: d.title,
        date: d.date,
      })),
    },
  });
  console.log(`Title and date duplicates: ${titleDateDuplicates.length}`);
  console.log('searching for duplicates in DOI...'.yellow);
  const duplicateDOIs = await prisma.searchResults.groupBy({
    by: ['doi'],
    having: {
      doi: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: {
      doi: true,
    },
  });

  const doiDuplicates = await prisma.searchResults.findMany({
    where: {
      doi: {
        in: duplicateDOIs.map((d) => d.doi),
      },
    },
  });

  console.log(`DOI duplicates: ${doiDuplicates.length}`);
  console.log('searching for duplicates in Title and Date...'.yellow);
  // Find Duplicates by Title and Date

  console.log('Combining results...'.yellow);
  // Combine Results and Remove Exact Duplicates
  const allDuplicates = [...doiDuplicates, ...titleDateDuplicates];
  console.log('Removing exact duplicates...'.yellow);
  // Remove exact duplicates if any
  const uniqueDuplicates = Array.from(
    new Set(allDuplicates.map((a) => JSON.stringify(a)))
  ).map((str) => JSON.parse(str));
  console.log('Processing duplicates...'.yellow);

  console.log(`Title and date duplicates: ${uniqueDuplicates.length}`);
}

async function deduplicateSearchResultV4(searchResults) {
  console.log('searching for duplicates in Title and Date...'.yellow);
  const duplicateTitleDates = await prisma.searchResults.groupBy({
    by: ['title', 'date'],
    having: {
      AND: [
        {
          title: {
            _count: {
              gt: 1,
            },
          },
        },
        {
          date: {
            _count: {
              gt: 1,
            },
          },
        },
      ],
    },
    _count: {
      _all: true,
    },
  });

  const titleDateDuplicates = await prisma.searchResults.findMany({
    where: {
      OR: duplicateTitleDates.map((d) => ({
        title: d.title,
        date: d.date,
      })),
    },
  });
  console.log(`Title and date duplicates: ${titleDateDuplicates.length}`);

  console.log('searching for duplicates in DOI...'.yellow);
  const duplicateDOIs = await prisma.searchResults.groupBy({
    by: ['doi'],
    having: {
      doi: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: {
      doi: true,
    },
  });

  const doiDuplicates = await prisma.searchResults.findMany({
    where: {
      doi: {
        in: duplicateDOIs.map((d) => d.doi),
      },
    },
  });
  console.log(`DOI duplicates: ${doiDuplicates.length}`);

  const allDuplicates = [...doiDuplicates, ...titleDateDuplicates];

  // Removing exact duplicates if any
  const uniqueDuplicates = Array.from(
    new Set(allDuplicates.map((a) => JSON.stringify(a)))
  ).map((str) => JSON.parse(str));

  console.log('Processing duplicates...'.yellow);

  const deduplicated = await prisma.deduplicated.findMany({
    where: {
      OR: [
        {
          doi: {
            in: uniqueDuplicates.map((i) => i.doi).filter(Boolean),
          },
        },
        {
          AND: [
            {
              title: { in: uniqueDuplicates.map((i) => i.title) },
            },
            {
              date: { in: uniqueDuplicates.map((i) => i.date) },
            },
          ],
        },
      ],
    },
  });

  const deduplicatedToCreate = [];
  const searchResults_DeduplicatedToCreate = [];
  const deduplicatedToUpdate = [];

  for (let item of searchResults) {
    let dedup = deduplicated.find(
      (d) =>
        (item.doi && d.doi === item.doi) ||
        (d.title === item.title && d.date === item.date)
    );

    if (dedup) {
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: dedup.id,
      });

      deduplicatedToUpdate.push({
        where: { id: dedup.id },
        data: {
          item_ids: { push: item.identifierInSource.toString() },
          number_of_sources: { increment: 1 },
          average_rank: Math.floor(
            dedup.average_rank +
              (item.itemPositionWithinSearch - dedup.average_rank) /
                (dedup.number_of_sources + 1)
          ),
        },
      });
    } else {
      const newDedup = {
        id: uuid(),
        title: item.title,
        abstract: item.abstract,
        keywords: item.keywords,
        doi: item.doi,
        date: item.date,
        otherIdentifier: item.identifierInSource,
        flag: null,
        item_ids: [item.identifierInSource.toString()],
        number_of_sources: 1,
        average_rank: item.itemPositionWithinSearch,
      };

      deduplicatedToCreate.push(newDedup);
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: newDedup.id,
      });
      deduplicated.push(newDedup);
    }
  }

  const updateTransactions = deduplicatedToUpdate.map((item) =>
    prisma.deduplicated.update(item)
  );

  const transactions = [
    deduplicatedToCreate.length > 0
      ? prisma.deduplicated.createMany({ data: deduplicatedToCreate })
      : null,
    searchResults_DeduplicatedToCreate.length > 0
      ? prisma.searchResults_Deduplicated.createMany({
          data: searchResults_DeduplicatedToCreate,
        })
      : null,
    ...updateTransactions,
  ].filter(Boolean);

  await prisma.$transaction(transactions);
}
async function deduplicateSearchResultV5(searchResults) {
  console.log('Identifying duplicates...'.yellow);

  const duplicateTitleDates = await prisma.searchResults.groupBy({
    by: ['title', 'date'],
    having: {
      AND: [
        {
          title: {
            _count: {
              gt: 1,
            },
          },
        },
        {
          date: {
            _count: {
              gt: 1,
            },
          },
        },
      ],
    },
    _count: {
      _all: true,
    },
  });

  const duplicateDOIs = await prisma.searchResults.groupBy({
    by: ['doi'],
    having: {
      _count: {
        doi: {
          gt: 1,
        },
      },
    },
    _count: {
      doi: true,
    },
  });

  const duplicates = [...duplicateTitleDates, ...duplicateDOIs];

  const deduplicatedToCreate = [];
  const searchResults_DeduplicatedToCreate = [];
  const deduplicatedToUpdate = [];

  const existingDeduplicated = await prisma.deduplicated.findMany({
    where: {
      OR: [
        {
          doi: {
            in: duplicates.map((d) => d.doi).filter(Boolean),
          },
        },
        {
          AND: [
            {
              title: { in: duplicates.map((d) => d.title).filter(Boolean) },
            },
            {
              date: { in: duplicates.map((d) => d.date).filter(Boolean) },
            },
          ],
        },
      ],
    },
  });

  for (let item of searchResults) {
    let dedup = existingDeduplicated.find(
      (d) =>
        (item.doi && d.doi === item.doi) ||
        (d.title === item.title && d.date === item.date)
    );

    if (dedup) {
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: dedup.id,
      });

      deduplicatedToUpdate.push({
        where: { id: dedup.id },
        data: {
          item_ids: { push: item.identifierInSource.toString() },
          number_of_sources: { increment: 1 },
          average_rank: Math.floor(
            dedup.average_rank +
              (item.itemPositionWithinSearch - dedup.average_rank) /
                (dedup.number_of_sources + 1)
          ),
        },
      });
    } else {
      const newDedup = {
        id: uuid(),
        title: item.title,
        abstract: item.abstract,
        keywords: item.keywords,
        doi: item.doi,
        date: item.date,
        otherIdentifier: item.identifierInSource,
        flag: null,
        item_ids: [item.identifierInSource.toString()],
        number_of_sources: 1,
        average_rank: item.itemPositionWithinSearch,
      };

      deduplicatedToCreate.push(newDedup);
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: newDedup.id,
      });
      existingDeduplicated.push(newDedup);
    }
  }

  const updateTransactions = deduplicatedToUpdate.map((item) =>
    prisma.deduplicated.update(item)
  );

  const transactions = [
    deduplicatedToCreate.length > 0
      ? prisma.deduplicated.createMany({ data: deduplicatedToCreate })
      : null,
    searchResults_DeduplicatedToCreate.length > 0
      ? prisma.searchResults_Deduplicated.createMany({
          data: searchResults_DeduplicatedToCreate,
        })
      : null,
    ...updateTransactions,
  ].filter(Boolean);

  await prisma.$transaction(transactions);
}
async function deduplicateSearchResultV6() {
  console.log('searching for duplicates in Title and Date...'.yellow);
  const duplicateTitleDates = await prisma.searchResults.groupBy({
    by: ['title', 'date'],
    having: {
      AND: [
        {
          title: {
            _count: {
              gt: 1,
            },
          },
        },
        {
          date: {
            _count: {
              gt: 1,
            },
          },
        },
      ],
    },
    _count: {
      _all: true,
    },
  });

  const titleDateDuplicates = await prisma.searchResults.findMany({
    where: {
      OR: duplicateTitleDates.map((d) => ({
        title: d.title,
        date: d.date,
      })),
    },
  });
  console.log(`Title and date duplicates: ${titleDateDuplicates.length}`);
  console.log('searching for duplicates in DOI...'.yellow);
  const duplicateDOIs = await prisma.searchResults.groupBy({
    by: ['doi'],
    having: {
      doi: {
        _count: {
          gt: 1,
        },
        not: {
          equals: '',
        },
      },
    },
    _count: {
      doi: true,
    },
  });

  const doiDuplicates = await prisma.searchResults.findMany({
    where: {
      doi: {
        in: duplicateDOIs.map((d) => d.doi),
      },
    },
  });

  console.log(`DOI duplicates: ${doiDuplicates.length}`);
  console.log('searching for duplicates in Title and Date...'.yellow);
  // Find Duplicates by Title and Date

  console.log('Combining results...'.yellow);
  // Combine Results and Remove Exact Duplicates
  const allDuplicates = [...doiDuplicates, ...titleDateDuplicates];
  console.log('Removing exact duplicates...'.yellow);
  // Remove exact duplicates if any
  const uniqueDuplicates = Array.from(
    new Set(allDuplicates.map((a) => JSON.stringify(a)))
  ).map((str) => JSON.parse(str));
  console.log(`Unique duplicates: ${uniqueDuplicates.length}`);

  const existingDeduplicated = await getExistingDeduplicatedRecords(
    uniqueDuplicates
  );
  console.log(`Existing deduplicated: ${existingDeduplicated.length}`);
  const {
    deduplicatedToCreate,
    searchResults_DeduplicatedToCreate,
    deduplicatedToUpdate,
  } = await processDuplicates(uniqueDuplicates, existingDeduplicated);
  console.log(`Deduplicated to create: ${deduplicatedToCreate.length}`);
  console.log(
    `SearchResults_Deduplicated to create: ${searchResults_DeduplicatedToCreate.length}`
  );
  console.log(`Deduplicated to update: ${deduplicatedToUpdate.length}`);
  console.log('Updating deduplicated...'.yellow);
  const updateTransactions = deduplicatedToUpdate.map((item) =>
    prisma.deduplicated.update(item)
  );
  console.log('Creating deduplicated...'.yellow);
  const transactions = [
    deduplicatedToCreate.length > 0
      ? prisma.deduplicated.createMany({ data: deduplicatedToCreate })
      : null,
    searchResults_DeduplicatedToCreate.length > 0
      ? prisma.searchResults_Deduplicated.createMany({
          data: searchResults_DeduplicatedToCreate,
        })
      : null,
    ...updateTransactions,
  ].filter(Boolean);

  await prisma.$transaction(transactions);
  console.log('Deduplication complete.'.green);
}

async function getExistingDeduplicatedRecords(duplicates) {
  return await prisma.deduplicated.findMany({
    where: {
      OR: [
        {
          doi: {
            in: duplicates.map((d) => d.doi).filter(Boolean),
          },
        },
        {
          AND: [
            {
              title: { in: duplicates.map((d) => d.title).filter(Boolean) },
            },
            {
              date: { in: duplicates.map((d) => d.date).filter(Boolean) },
            },
          ],
        },
      ],
    },
  });
}

async function processDuplicates(duplicates, existingDeduplicated) {
  const deduplicatedToCreate = [];
  const searchResults_DeduplicatedToCreate = [];
  const deduplicatedToUpdate = [];

  console.log(`Existing deduplicated: ${existingDeduplicated.length}`);
  for (let item of duplicates) {
    let dedup = existingDeduplicated.find(
      (d) =>
        (item.doi && d.doi === item.doi) ||
        (d.title === item.title && d.date === item.date)
    );

    if (dedup) {
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: dedup.id,
      });

      deduplicatedToUpdate.push({
        where: { id: dedup.id },
        data: {
          item_ids: { push: item.identifierInSource.toString() },
          number_of_sources: { increment: 1 },
          average_rank: Math.floor(
            dedup.average_rank +
              (item.itemPositionWithinSearch - dedup.average_rank) /
                (dedup.number_of_sources + 1)
          ),
        },
      });
    } else {
      const newDedup = {
        id: uuid.v4(),
        title: item.title,
        abstract: item.abstract,
        keywords: item.keywords,
        doi: item.doi,
        date: item.date,
        otherIdentifier: item.identifierInSource,
        flag: null,
        item_ids: [item.identifierInSource.toString()],
        number_of_sources: 1,
        average_rank: item.itemPositionWithinSearch,
      };

      deduplicatedToCreate.push(newDedup);
      searchResults_DeduplicatedToCreate.push({
        searchResultsId: item.id,
        deduplicatedId: newDedup.id,
      });
      existingDeduplicated.push(newDedup);
    }
  }

  return {
    deduplicatedToCreate,
    searchResults_DeduplicatedToCreate,
    deduplicatedToUpdate,
  };
}

async function deleteDeduplicated() {
  console.log('Deleting search deduplicated...'.yellow);
  await prisma.searchResults_Deduplicated.deleteMany();
  console.log('Deleting deduplicated...'.yellow);
  await prisma.deduplicated.deleteMany();
  // await prisma.searchResults.deleteMany();
}
module.exports = { deduplicate };
