require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const userRoutes = require('./rest/routes/users');
const sessionRoutes = require('./rest/routes/sessions');
const leaderboardRoutes = require('./rest/routes/leaderboard');

const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

const app = express();
app.use(express.json());

// Set up REST endpoints
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

const startServer = async () => {
  // Set up GraphQL Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  app.use('/graphql', expressMiddleware(server));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API Gateway REST running on http://localhost:${PORT}/api`);
    console.log(`API Gateway GraphQL running on http://localhost:${PORT}/graphql`);
  });
};

startServer().catch(console.error);
