const { Kafka } = require('kafkajs');
const { updateScore } = require('../handlers/leaderboardHandlers');

const kafka = new Kafka({
  clientId: 'leaderboard-consumer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'leaderboard-service-group' });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'session.completed', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (topic === 'session.completed') {
        const data = JSON.parse(message.value.toString());
        console.log('[Kafka Consumer] Received session.completed:', data.session_id);
        
        const game = data.game_name;
        const winnerId = data.winner_id;

        // Iterate through all scores from the session and process them
        for (const scoreEntry of data.scores) {
          const isWin = scoreEntry.player_id === winnerId;
          
          // Construct a mock gRPC call to reuse our updateScore handler locally
          const mockCall = {
            request: {
              player_id: scoreEntry.player_id,
              game: game,
              score: scoreEntry.score,
              is_win: isWin
            }
          };

          updateScore(mockCall, (error, response) => {
            if (error) {
              console.error(`Failed to handle score for player ${scoreEntry.player_id}`, error);
            } else {
              console.log(`Processed score for player ${scoreEntry.player_id}`);
            }
          });
        }
      }
    },
  });
};

run().catch(console.error);

module.exports = consumer;
