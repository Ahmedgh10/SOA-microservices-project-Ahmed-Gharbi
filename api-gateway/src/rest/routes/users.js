const express = require('express');
const router = express.Router();
const userClient = require('../../grpc/userClient');

router.post('/', (req, res) => {
  userClient.CreateUser(req.body, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(response);
  });
});

router.get('/:id', (req, res) => {
  userClient.GetUser({ user_id: req.params.id }, (err, response) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(response);
  });
});

router.put('/:id', (req, res) => {
  const payload = { user_id: req.params.id, ...req.body };
  userClient.UpdateUser(payload, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

router.delete('/:id', (req, res) => {
  userClient.DeleteUser({ user_id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  userClient.ListUsers({ page, limit }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});

module.exports = router;
