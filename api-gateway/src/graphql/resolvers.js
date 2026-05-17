const userClient = require('../grpc/userClient');
const sessionClient = require('../grpc/sessionClient');
const leaderboardClient = require('../grpc/leaderboardClient');

// Helper function to wrap gRPC calls in promises
const grpcCall = (client, method, params) => {
  return new Promise((resolve, reject) => {
    client[method](params, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
};

const resolvers = {
  Query: {
    getUser: async (_, { user_id }) => {
      return await grpcCall(userClient, 'GetUser', { user_id });
    },
    listUsers: async (_, { page = 1, limit = 10 }) => {
      const res = await grpcCall(userClient, 'ListUsers', { page, limit });
      return res.users || [];
    },
    getSession: async (_, { session_id }) => {
      return await grpcCall(sessionClient, 'GetSession', { session_id });
    },
    listSessions: async (_, { status = '' }) => {
      const res = await grpcCall(sessionClient, 'ListSessions', { status });
      return res.sessions || [];
    },
    getLeaderboard: async (_, { top_n = 10, game = '' }) => {
      const res = await grpcCall(leaderboardClient, 'GetLeaderboard', { top_n, game });
      return res.entries || [];
    },
    getPlayerStats: async (_, { player_id }) => {
      return await grpcCall(leaderboardClient, 'GetPlayerStats', { player_id });
    },
    getPlayerAchievements: async (_, { player_id }) => {
      const res = await grpcCall(leaderboardClient, 'GetAchievements', { player_id });
      return res.achievements || [];
    }
  },
  Mutation: {
    createUser: async (_, { username, email, password }) => {
      return await grpcCall(userClient, 'CreateUser', { username, email, password });
    },
    createSession: async (_, { game_name, host_id, max_players }) => {
      return await grpcCall(sessionClient, 'CreateSession', { game_name, host_id, max_players });
    },
    joinSession: async (_, { session_id, player_id }) => {
      return await grpcCall(sessionClient, 'JoinSession', { session_id, player_id });
    },
    endSession: async (_, { session_id, winner_id, scores }) => {
      return await grpcCall(sessionClient, 'EndSession', { session_id, winner_id, scores });
    }
  }
};

module.exports = resolvers;
