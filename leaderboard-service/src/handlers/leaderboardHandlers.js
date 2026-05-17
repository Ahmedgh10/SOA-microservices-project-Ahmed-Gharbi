const { getDb } = require('../db/rxdb');
const { publishScoreUpdated, publishAchievementUnlocked } = require('../kafka/producer');

const getLeaderboard = async (call, callback) => {
  const { top_n, game } = call.request;
  const limit = top_n > 0 ? top_n : 10;

  try {
    const db = await getDb();
    // InRxDB memory storage, we fetch all and sort manually for simplicity
    const allStats = await db.player_stats.find().exec();
    
    // Convert to plain JSON and sort by total_score descending
    let sorted = allStats.map(doc => doc.toJSON()).sort((a, b) => b.total_score - a.total_score);

    // Apply ranking
    const entries = sorted.slice(0, limit).map((stat, index) => ({
      player_id: stat.player_id,
      username: stat.username || 'Unknown',
      total_score: stat.total_score,
      rank: index + 1,
      wins: stat.wins
    }));

    callback(null, { entries });
  } catch (error) {
    console.error(error);
    callback({ code: 13, message: 'Failed to fetch leaderboard' });
  }
};

const getPlayerStats = async (call, callback) => {
  const { player_id } = call.request;

  try {
    const db = await getDb();
    const statDoc = await db.player_stats.findOne({
      selector: { player_id }
    }).exec();

    if (statDoc) {
      const data = statDoc.toJSON();
      callback(null, {
        player_id: data.player_id,
        total_score: data.total_score,
        wins: data.wins,
        games_played: data.games_played,
        rank: data.rank || 0
      });
    } else {
      callback({ code: 5, message: 'Player stats not found' });
    }
  } catch (error) {
    callback({ code: 13, message: 'Error retrieving player stats' });
  }
};

const getAchievements = async (call, callback) => {
  const { player_id } = call.request;

  try {
    const db = await getDb();
    const statDoc = await db.player_stats.findOne({
      selector: { player_id }
    }).exec();

    if (statDoc && statDoc.achievements) {
      callback(null, { achievements: statDoc.achievements });
    } else {
      callback(null, { achievements: [] });
    }
  } catch (error) {
    callback({ code: 13, message: 'Error retrieving achievements' });
  }
};

const updateScore = async (call, callback) => {
  const { player_id, game, score, is_win } = call.request;

  try {
    const db = await getDb();
    let statDoc = await db.player_stats.findOne({ selector: { player_id } }).exec();

    let data;
    if (!statDoc) {
      // Create fresh
      data = {
        player_id,
        username: 'Player', // Ideally fetched from User service, mocked here
        total_score: score,
        wins: is_win ? 1 : 0,
        games_played: 1,
        rank: 0,
        game_scores: { [game]: score },
        achievements: [],
        updated_at: new Date().toISOString()
      };
      await db.player_stats.insert(data);
    } else {
      // Update existing
      data = statDoc.toJSON();
      data.total_score += score;
      if (is_win) data.wins += 1;
      data.games_played += 1;
      data.game_scores[game] = (data.game_scores[game] || 0) + score;
      data.updated_at = new Date().toISOString();
      await statDoc.patch(data);
    }

    // Example achievement logic
    if (data.wins >= 10 && !data.achievements.find(a => a.id === 'ACH_10_WINS')) {
      const achievement = {
        id: 'ACH_10_WINS',
        title: 'Victory Streak',
        description: 'Win 10 games',
        unlocked_at: new Date().toISOString()
      };
      
      data.achievements.push(achievement);
      if(statDoc) await statDoc.patch({ achievements: data.achievements });
      else {
        statDoc = await db.player_stats.findOne({ selector: { player_id } }).exec();
        await statDoc.patch({ achievements: data.achievements });
      }

      await publishAchievementUnlocked(player_id, achievement);
    }

    await publishScoreUpdated(player_id, data.total_score, data.wins);

    callback(null, { success: true, message: 'Score updated' });
  } catch (error) {
    console.error(error);
    callback({ code: 13, message: 'Failed to update score' });
  }
};

module.exports = {
  getLeaderboard,
  getPlayerStats,
  getAchievements,
  updateScore
};
