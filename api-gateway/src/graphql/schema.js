const typeDefs = `#graphql
  type User {
    user_id:    ID!
    username:   String!
    email:      String!
    total_wins: Int
    created_at: String
  }

  type Session {
    session_id:  ID!
    game_name:   String!
    host_id:     String!
    status:      String!
    winner_id:   String
    player_ids:  [String]
    created_at:  String
  }

  type LeaderboardEntry {
    rank:        Int!
    player_id:   ID!
    username:    String!
    total_score: Int!
    wins:        Int!
  }

  type PlayerStats {
    player_id:    ID!
    total_score:  Int!
    wins:         Int!
    games_played: Int!
    rank:         Int!
  }

  type Achievement {
    id:          ID!
    title:       String!
    description: String!
    unlocked_at: String!
  }

  type Query {
    getUser(user_id: ID!): User
    listUsers(page: Int, limit: Int): [User]

    getSession(session_id: ID!): Session
    listSessions(status: String): [Session]

    getLeaderboard(top_n: Int, game: String): [LeaderboardEntry]
    getPlayerStats(player_id: ID!): PlayerStats
    getPlayerAchievements(player_id: ID!): [Achievement]
  }

  type Mutation {
    createUser(username: String!, email: String!, password: String!): User
    createSession(game_name: String!, host_id: ID!, max_players: Int!): Session
    joinSession(session_id: ID!, player_id: ID!): Session
    endSession(session_id: ID!, winner_id: ID!, scores: [ScoreInput!]!): Session
  }

  input ScoreInput {
    player_id: ID!
    score:     Int!
  }
`;

module.exports = typeDefs;
