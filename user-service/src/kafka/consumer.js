const { Kafka } = require('kafkajs');
const db = require('../db/sqlite');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'user-service-group' });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'score.updated', fromBeginning: true });
  await consumer.subscribe({ topic: 'achievement.unlocked', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      if (topic === 'score.updated') {
        console.log('[Kafka Consumer] Received score.updated:', data);
        const stmt = db.prepare('UPDATE users SET total_wins = ? WHERE user_id = ?');
        stmt.run(data.new_wins, data.player_id);
      } 
      
      if (topic === 'achievement.unlocked') {
        console.log('[Kafka Consumer] Received achievement.unlocked:', data);
        const stmt = db.prepare('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)');
        stmt.run(data.player_id, data.achievement_id);
      }
    },
  });
};

run().catch(console.error);

module.exports = consumer;
