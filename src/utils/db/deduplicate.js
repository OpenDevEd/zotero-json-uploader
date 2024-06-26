const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const colors = require('colors');
const fs = require('fs');
const uuid = require('uuid');

async function deduplicate() {
  // await prisma.deduplicated.deleteMany();
  // await prisma.searchResults_Deduplicated.deleteMany();
  // await prisma.searchResults.deleteMany();
  // await deleteDeduplicated();
  await deduplicateSearchResultV6();
  console.log(` -> Deduplication 1/2 complete`.green);
  // find the search results that donst have any
  // deduplicate and create it in the deduplicated table
  await createNonDeduplicate();
  console.log(` -> Deduplication 2/2 complete`.green);

  console.log('Deduplication complete. 🎉'.green);

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
        date: item?.date ?? (new Date(item.date).getFullYear() || ''),
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
  // find duplicates in search results using the title and date (just if the doi is not available)
  const allDuplicates = await getDuplicates({
    gt: 1,
  });
  console.log('Removing exact duplicates...');
  // Remove exact duplicates if any
  const uniqueDuplicates = Array.from(
    new Set(allDuplicates.map((a) => JSON.stringify(a)))
  ).map((str) => JSON.parse(str));
  console.log(` -> Unique duplicates: ${uniqueDuplicates.length}`.yellow);

  const existingDeduplicated = await getExistingDeduplicatedRecords(
    uniqueDuplicates
  );
  console.log(`Existing deduplicated: ${existingDeduplicated.length}`);
  const {
    deduplicatedToCreate,
    searchResults_DeduplicatedToCreate,
    deduplicatedToUpdate,
  } = await processDuplicates(uniqueDuplicates, existingDeduplicated);

  console.log(
    `Found ${deduplicatedToCreate.length} new deduplicated records`.yellow
  );
  // print how many records are going to be updated
  console.log(`Updating ${deduplicatedToUpdate.length} records...`.yellow);
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

async function getDuplicates(role) {
  console.log('searching for duplicates in Title and Date...');
  const duplicateTitleDates = await prisma.searchResults.groupBy({
    by: ['title', 'date'],
    having: {
      AND: [
        {
          title: {
            _count: role,
          },
        },
        {
          date: {
            _count: role,
          },
        },
      ],
    },
    where: {
      OR: [
        {
          doi: {
            equals: null,
          },
          doi: {
            equals: '',
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
  console.log(
    ` -> Title and date duplicates: ${titleDateDuplicates.length}`.yellow
  );

  // find duplicates in search results using the doi
  console.log('searching for duplicates in DOI...');
  const duplicateDOIs = await prisma.searchResults.groupBy({
    by: ['doi'],
    having: {
      doi: {
        _count: role,
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
  console.log(` -> DOI duplicates: ${doiDuplicates.length}`.yellow);

  console.log('Combining results...');
  // Combine Results and Remove Exact Duplicates
  return [...doiDuplicates, ...titleDateDuplicates];
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

  let linkedDedup = [];
  linkedDedup = await prisma.searchResults_Deduplicated.findMany({
    where: {
      searchResultsId: {
        in: duplicates.map((d) => d.id),
      },
    },
  });

  for (let item of duplicates) {
    let dedup = existingDeduplicated.find(
      (d) =>
        (item.doi && d.doi === item.doi) ||
        (d.title === item.title && d.date === item.date)
    );

    if (dedup) {
      // check if the search result is already linked to the dedup
      const isLinked = linkedDedup.find(
        (l) => l.deduplicatedId === dedup.id && l.searchResultsId === item.id
      );

      if (isLinked) continue;
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
        date: item.date ?? (new Date(item.date).getFullYear() || ''),
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
  console.log('Deleting search<->deduplicated relations...'.yellow);
  await prisma.searchResults_Deduplicated.deleteMany();
  console.log('Deleting deduplicated...'.yellow);
  await prisma.deduplicated.deleteMany();
  // await prisma.searchResults.deleteMany();
}

async function createNonDeduplicate(allDuplicates) {
  const config = {
    take: 10000,
    skip: 0,
  };
  console.log('Creating non-deduplicated records...'.yellow);
  // get all search results that don't have a dedup
  // const searchResultsCount = await prisma.searchResults.count({
  //   where: { SearchResults_Deduplicated: { none: {} } },
  // });
  // changed it to raw query because it was taking so long takes around 1-3 min sometimes and my raw query takes 1-2 sec to run
  const searchResultsCount = await prisma.$queryRaw`SELECT COUNT(*)
FROM searchtrailstest."SearchResults"
WHERE NOT EXISTS (
    SELECT 1
    FROM searchtrailstest."SearchResults_Deduplicated"
    WHERE searchtrailstest."SearchResults"."id" = searchtrailstest."SearchResults_Deduplicated"."searchResultsId"
);`;

  console.log(
    `Total search results to process: ${searchResultsCount[0].count}`.yellow
  );

  const iterations = Math.ceil(
    parseInt(searchResultsCount[0].count) / config.take
  );
  console.log(`Total iterations: ${iterations}`.yellow);

  for (let i = 0; i < iterations; i++) {
    // get all search results that don't have a dedup
    // const searchResults = await prisma.searchResults.findMany({
    //   take: config.take,
    //   where: { SearchResults_Deduplicated: { none: {} } },
    // });

    const searchResults = await prisma.$queryRaw`
    SELECT *
    FROM searchtrailstest."SearchResults"
    WHERE NOT EXISTS (
        SELECT 1
        FROM searchtrailstest."SearchResults_Deduplicated"
        WHERE searchtrailstest."SearchResults"."id" = searchtrailstest."SearchResults_Deduplicated"."searchResultsId"
    )
    LIMIT ${config.take};
`;

    if (searchResults.length === 0) {
      console.log(searchResults);
      break;
    }

    // create all in deduplicated
    const deduplicatedToCreate = searchResults.map((item) => ({
      id: uuid.v4(),
      title: item.title,
      abstract: item.abstract,
      keywords: item.keywords,
      doi: item.doi,
      date: item.date ?? (new Date(item.date).getFullYear() || ''),
      otherIdentifier: item.identifierInSource,
      flag: null,
      item_ids: [item.identifierInSource.toString()],
      number_of_sources: 1,
      average_rank: item.itemPositionWithinSearch,
    }));

    // create all in searchResults_Deduplicated
    const searchResults_DeduplicatedToCreate = searchResults.map((item) => ({
      searchResultsId: item.id,
      deduplicatedId: deduplicatedToCreate.find(
        (d) => d.otherIdentifier === item.identifierInSource
      ).id,
    }));

    const res = await prisma.$transaction([
      prisma.deduplicated.createMany({ data: deduplicatedToCreate }),
      prisma.searchResults_Deduplicated.createMany({
        data: searchResults_DeduplicatedToCreate,
      }),
    ]);

    if (res) {
      console.log(
        `Created ${searchResults.length} non-deduplicated records`.yellow
      );
    }
  }
}

module.exports = { deduplicate };
