require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const sessionHandlers = require('./handlers/sessionHandlers');

const PROTO_PATH = path.join(__dirname, '../../proto/session.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const sessionProto = grpc.loadPackageDefinition(packageDefinition).session;

const server = new grpc.Server();

server.addService(sessionProto.SessionService.service, {
  CreateSession: sessionHandlers.createSession,
  GetSession: sessionHandlers.getSession,
  JoinSession: sessionHandlers.joinSession,
  EndSession: sessionHandlers.endSession,
  ListSessions: sessionHandlers.listSessions
});

const PORT = process.env.GRPC_PORT || 50052;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Session Service running on port ${PORT}`);
});
