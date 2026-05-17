# GameArena Microservices Platform

GameArena is a Node.js microservices backend for online gaming and esports tournaments. Players register, create and join sessions, submit match results, and receive leaderboard rankings and achievements through an event-driven flow.

## Architecture

```text
Client / Postman
      |
      | REST JSON / GraphQL
      v
API Gateway :3000
      |
      | gRPC
      +-------------------+---------------------+
      |                   |                     |
      v                   v                     v
User Service :50051  Session Service :50052  Leaderboard Service :50053
      |                   |                     |
      v                   v                     v
SQLite users.db      SQLite sessions.db      RxDB leaderboard store
      ^                   |                     |
      |                   | session.completed   |
      |                   v                     |
      +--------- Kafka localhost:9092 <---------+
            score.updated / achievement.unlocked
```

## Services

| Service | Port | Role | Storage |
|---|---:|---|---|
| API Gateway | 3000 | REST and GraphQL entry point, gRPC client | None |
| User Service | 50051 | Player profiles and total wins | SQLite |
| Session Service | 50052 | Game sessions, joins, results | SQLite |
| Leaderboard Service | 50053 | Rankings, stats, achievements | RxDB |

## Requirements

- Node.js 18 or newer
- npm
- Docker Desktop for Kafka
- Postman, optional for API testing

## Install

Install dependencies for each service:

```bash
cd user-service && npm install
cd ../session-service && npm install
cd ../leaderboard-service && npm install
cd ../api-gateway && npm install
```

## Run

Start Kafka:

```bash
docker compose up -d
```

Start each service in a separate terminal from the `gamearena` folder:

```bash
cd user-service
node src/index.js
```

```bash
cd session-service
node src/index.js
```

```bash
cd leaderboard-service
node src/index.js
```

```bash
cd api-gateway
node src/index.js
```

The API Gateway exposes:

- REST: `http://localhost:3000/api`
- GraphQL: `http://localhost:3000/graphql`

## REST Endpoints

### Users

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Create a player |
| GET | `/api/users/:id` | Get one player |
| PUT | `/api/users/:id` | Update a player |
| DELETE | `/api/users/:id` | Delete a player |
| GET | `/api/users?page=1&limit=10` | List players |

Create player:

```json
{
  "username": "player99",
  "email": "player99@arena.com",
  "password": "secure123"
}
```

### Sessions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions` | Create a session |
| GET | `/api/sessions/:id` | Get one session |
| POST | `/api/sessions/:id/join` | Join a session |
| POST | `/api/sessions/:id/end` | End a session and publish scores |
| GET | `/api/sessions?status=open` | List sessions |

End session:

```json
{
  "winner_id": "PLAYER_1_ID",
  "scores": [
    { "player_id": "PLAYER_1_ID", "score": 1000 },
    { "player_id": "PLAYER_2_ID", "score": 500 }
  ]
}
```

### Leaderboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaderboard?top_n=10` | Get top players |
| GET | `/api/leaderboard/:playerId/stats` | Get player stats |
| GET | `/api/leaderboard/:playerId/achievements` | Get achievements |

## GraphQL

Use `POST http://localhost:3000/graphql`.

Example leaderboard query:

```graphql
query {
  getLeaderboard(top_n: 10) {
    rank
    player_id
    username
    total_score
    wins
  }
}
```

Example full player dashboard:

```graphql
query PlayerDashboard($playerId: ID!) {
  getPlayerStats(player_id: $playerId) {
    player_id
    total_score
    wins
    games_played
    rank
  }
  getPlayerAchievements(player_id: $playerId) {
    title
    description
    unlocked_at
  }
}
```

Example mutation:

```graphql
mutation {
  createSession(game_name: "Valorant", host_id: "PLAYER_ID", max_players: 5) {
    session_id
    status
    player_ids
  }
}
```

## gRPC Contracts

The protobuf contracts are in `proto/`:

- `proto/user.proto`
- `proto/session.proto`
- `proto/leaderboard.proto`

The API Gateway uses these contracts to call the three services internally.

## Kafka Topics

| Topic | Producer | Consumer | Purpose |
|---|---|---|---|
| `session.completed` | Session Service | Leaderboard Service | Emitted when a session ends |
| `score.updated` | Leaderboard Service | User Service | Emitted after leaderboard score changes |
| `achievement.unlocked` | Leaderboard Service | User Service | Emitted when a player unlocks an achievement |

Event flow:

1. Client calls `POST /api/sessions/:id/end`.
2. API Gateway calls `SessionService.EndSession` using gRPC.
3. Session Service saves the result and publishes `session.completed`.
4. Leaderboard Service consumes the event, updates scores, and publishes score and achievement events.
5. User Service consumes those events and updates profile data.

## Databases

### User Service SQLite

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  total_wins INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

```sql
CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### Session Service SQLite

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  game_name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  winner_id TEXT,
  max_players INTEGER DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now'))
);
```

```sql
CREATE TABLE session_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

### Leaderboard Service RxDB

The `player_stats` collection stores:

```json
{
  "player_id": "uuid",
  "username": "player",
  "total_score": 14500,
  "wins": 12,
  "games_played": 24,
  "rank": 3,
  "game_scores": {
    "Valorant": 8500
  },
  "achievements": []
}
```

## Integration Test

After Kafka and all services are running:

```bash
node test_integration.js
```

The script registers players, creates a session, joins a player, ends the session, waits for Kafka processing, then reads leaderboard stats and achievements.

## Postman

Import the collection at:

```text
postman/GameArena.postman_collection.json
```

The collection includes REST and GraphQL examples for the API Gateway. gRPC requests can be created in Postman from the protobuf files in `proto/`.

## Repository Structure

```text
gamearena/
  api-gateway/
  leaderboard-service/
  postman/
  proto/
  session-service/
  user-service/
  docker-compose.yml
  test_integration.js
```
