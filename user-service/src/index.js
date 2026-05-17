require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const userHandlers = require('./handlers/userHandlers');

// Initialize Kafka Consumers
require('./kafka/consumer');

const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const server = new grpc.Server();

server.addService(userProto.UserService.service, {
  CreateUser: userHandlers.createUser,
  GetUser: userHandlers.getUser,
  UpdateUser: userHandlers.updateUser,
  DeleteUser: userHandlers.deleteUser,
  ListUsers: userHandlers.listUsers
});

const PORT = process.env.GRPC_PORT || 50051;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`User Service running on port ${PORT}`);
});
