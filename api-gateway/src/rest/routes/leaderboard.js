const express = require('express');
const router = express.Router();
const leaderboardClient = require('../../grpc/leaderboardClient');

router.get('/', (req, res) => {
  const top_n = parseInt(req.query.top_n) || 10;
  leaderboardClient.GetLeaderboard({ top_n }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response.entries || []);
  });
});

router.get('/:playerId/stats', (req, res) => {
  leaderboardClient.GetPlayerStats({ player_id: req.params.playerId }, (err, response) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(response);
  });
});

router.get('/:playerId/achievements', (req, res) => {
  leaderboardClient.GetAchievements({ player_id: req.params.playerId }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response.achievements || []);
  });
});

module.exports = router;
