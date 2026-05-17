require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const leaderboardHandlers = require('./handlers/leaderboardHandlers');

// Initialize database
require('./db/rxdb').getDb();

// Initialize Kafka Consumer
require('./kafka/consumer');

const PROTO_PATH = path.join(__dirname, '../../proto/leaderboard.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const leaderboardProto = grpc.loadPackageDefinition(packageDefinition).leaderboard;

const server = new grpc.Server();

server.addService(leaderboardProto.LeaderboardService.service, {
  GetLeaderboard: leaderboardHandlers.getLeaderboard,
  GetPlayerStats: leaderboardHandlers.getPlayerStats,
  GetAchievements: leaderboardHandlers.getAchievements,
  UpdateScore: leaderboardHandlers.updateScore
});

const PORT = process.env.GRPC_PORT || 50053;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Leaderboard Service running on port ${PORT}`);
});
