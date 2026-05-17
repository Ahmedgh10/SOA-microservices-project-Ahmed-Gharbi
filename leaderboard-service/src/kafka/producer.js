const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'leaderboard-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

const connectProducer = async () => {
  await producer.connect();
};
connectProducer().catch(console.error);

const publishScoreUpdated = async (playerId, newTotalScore, newWins) => {
  try {
    await producer.send({
      topic: 'score.updated',
      messages: [
        {
          value: JSON.stringify({
            event: 'score.updated',
            player_id: playerId,
            new_total_score: newTotalScore,
            new_wins: newWins,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log(`[Kafka Producer] Published score.updated for ${playerId}`);
  } catch (error) {
    console.error('[Kafka Producer] Error publishing score.updated', error);
  }
};

const publishAchievementUnlocked = async (playerId, achievement) => {
  try {
    await producer.send({
      topic: 'achievement.unlocked',
      messages: [
        {
          value: JSON.stringify({
            event: 'achievement.unlocked',
            player_id: playerId,
            achievement_id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log(`[Kafka Producer] Published achievement.unlocked for ${playerId} - ${achievement.id}`);
  } catch (error) {
    console.error('[Kafka Producer] Error publishing achievement.unlocked', error);
  }
};

module.exports = {
  publishScoreUpdated,
  publishAchievementUnlocked
};
