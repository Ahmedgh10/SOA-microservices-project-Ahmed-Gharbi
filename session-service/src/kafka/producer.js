const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'session-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

const connectProducer = async () => {
  await producer.connect();
};
connectProducer().catch(console.error);

const publishSessionCompleted = async (session) => {
  try {
    await producer.send({
      topic: 'session.completed',
      messages: [
        {
          value: JSON.stringify({
            event: 'session.completed',
            session_id: session.session_id,
            game_name: session.game_name,
            winner_id: session.winner_id,
            scores: session.scores, // array of { player_id, score }
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log(`[Kafka Producer] Published session.completed for ${session.session_id}`);
  } catch (err) {
    console.error('[Kafka Producer] Error publishing message', err);
  }
};

module.exports = {
  publishSessionCompleted
};
