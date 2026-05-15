const { closeConnections } = require('./utils');
const seedPostgres = require('./seedPostgres');
const seedMongo = require('./seedMongo');

async function seedAll() {
  const postgres = await seedPostgres({ close: false });
  const mongo = await seedMongo({ close: false });
  console.log('[seed:all] complete', { postgres, mongo });
  await closeConnections();
  return { postgres, mongo };
}

if (require.main === module) {
  seedAll().catch(async (err) => {
    console.error('[seed:all] failed', err);
    await closeConnections();
    process.exit(1);
  });
}

module.exports = seedAll;
