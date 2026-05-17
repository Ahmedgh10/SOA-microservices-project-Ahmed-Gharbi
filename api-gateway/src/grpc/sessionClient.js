const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/session.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const SessionService = grpc.loadPackageDefinition(packageDefinition).session.SessionService;

const client = new SessionService(
  process.env.SESSION_SERVICE_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

module.exports = client;
