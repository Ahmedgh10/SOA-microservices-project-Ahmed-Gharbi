const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/leaderboard.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const LeaderboardService = grpc.loadPackageDefinition(packageDefinition).leaderboard.LeaderboardService;

const client = new LeaderboardService(
  process.env.LEADERBOARD_SERVICE_URL || 'localhost:50053',
  grpc.credentials.createInsecure()
);

module.exports = client;
