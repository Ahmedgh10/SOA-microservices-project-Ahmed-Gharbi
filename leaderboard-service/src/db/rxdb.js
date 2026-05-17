const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { wrappedValidateAjvStorage } = require('rxdb/plugins/validate-ajv');

const statsSchema = {
  version: 0,
  primaryKey: 'player_id',
  type: 'object',
  properties: {
    player_id: { type: 'string', maxLength: 100 },
    username: { type: 'string' },
    total_score: { type: 'number', minimum: 0 },
    wins: { type: 'number', minimum: 0 },
    games_played: { type: 'number', minimum: 0 },
    rank: { type: 'number' },
    game_scores: { type: 'object', additionalProperties: true },
    achievements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          unlocked_at: { type: 'string' }
        }
      }
    },
    updated_at: { type: 'string' }
  },
  required: ['player_id']
};

let dbPromise = null;

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = createRxDatabase({
      name: 'leaderboarddb' + Date.now(), // Avoid cache collision
      storage: wrappedValidateAjvStorage({ storage: getRxStorageMemory() }),
      ignoreDuplicate: true
    }).then(async (db) => {
      await db.addCollections({
        player_stats: {
          schema: statsSchema
        }
      });
      return db;
    });
  }
  return dbPromise;
};

module.exports = { getDb };
