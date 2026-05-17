const express = require('express');
const router = express.Router();
const sessionClient = require('../../grpc/sessionClient');

router.post('/', (req, res) => {
  sessionClient.CreateSession(req.body, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(response);
  });
});

router.get('/:id', (req, res) => {
  sessionClient.GetSession({ session_id: req.params.id }, (err, response) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(response);
  });
});

router.post('/:id/join', (req, res) => {
  const payload = { session_id: req.params.id, player_id: req.body.player_id };
  sessionClient.JoinSession(payload, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

router.post('/:id/end', (req, res) => {
  const payload = { 
    session_id: req.params.id, 
    winner_id: req.body.winner_id,
    scores: req.body.scores || []
  };
  sessionClient.EndSession(payload, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

router.get('/', (req, res) => {
  const status = req.query.status || '';
  sessionClient.ListSessions({ status }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

module.exports = router;
