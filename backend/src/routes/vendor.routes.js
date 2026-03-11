const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Serve next token
router.post('/serve', async (req, res) => {
  const { vendorId } = req.body;
  try {
    const queue = await prisma.queue.findFirst({ where: { vendorId: Number(vendorId) } });
    if (!queue) return res.status(404).json({ error: 'Queue not found' });
    
    // Find the current waiting token with lowest position
    const nextToken = await prisma.token.findFirst({
      where: { queueId: queue.id, status: 'WAITING' },
      orderBy: { position: 'asc' }
    });

    if (!nextToken) return res.status(400).json({ error: 'No tokens waiting in queue' });

    // Mark it as served
    await prisma.token.update({
      where: { id: nextToken.id },
      data: { status: 'SERVED', servedAt: new Date() }
    });

    // Update queue currentToken
    const updatedQueue = await prisma.queue.update({
      where: { id: queue.id },
      data: { currentToken: nextToken.position }
    });

    req.io.emit('queue_updated', { vendorId, queueId: queue.id, currentToken: nextToken.position });
    req.io.emit('token_served', { tokenNumber: nextToken.tokenNumber });

    res.json({ message: 'Token served', token: nextToken, queue: updatedQueue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Skip token
router.post('/skip', async (req, res) => {
  const { vendorId } = req.body;
  try {
    const queue = await prisma.queue.findFirst({ where: { vendorId: Number(vendorId) } });
    if (!queue) return res.status(404).json({ error: 'Queue not found' });
    
    const nextToken = await prisma.token.findFirst({
      where: { queueId: queue.id, status: 'WAITING' },
      orderBy: { position: 'asc' }
    });

    if (!nextToken) return res.status(400).json({ error: 'No tokens waiting' });

    // Mark as skipped
    await prisma.token.update({
      where: { id: nextToken.id },
      data: { status: 'SKIPPED' }
    });

    req.io.emit('queue_updated', { vendorId, queueId: queue.id });
    req.io.emit('token_skipped', { tokenNumber: nextToken.tokenNumber });

    res.json({ message: 'Token skipped', token: nextToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Queue
router.post('/reset', async (req, res) => {
  const { vendorId } = req.body;
  try {
    const queue = await prisma.queue.findFirst({ where: { vendorId: Number(vendorId) } });
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    await prisma.token.deleteMany({
      where: { queueId: queue.id }
    });

    await prisma.queue.update({
      where: { id: queue.id },
      data: { currentToken: 0, totalTokens: 0 }
    });

    req.io.emit('queue_reset', { vendorId, queueId: queue.id });
    res.json({ message: 'Queue reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats (Renamed from Analytics to bypass AdBlockers)
router.get('/stats/:vendorId', async (req, res) => {
  try {
    const queue = await prisma.queue.findFirst({ where: { vendorId: Number(req.params.vendorId) } });
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    // Total tokens served today setup logic
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const tokensServed = await prisma.token.count({
      where: {
        queueId: queue.id,
        status: 'SERVED',
        servedAt: { gte: startOfDay }
      }
    });

    const waitingTokens = await prisma.token.findMany({
      where: { queueId: queue.id, status: 'WAITING' },
      orderBy: { position: 'asc' }
    });

    res.json({
      totalTokensServedToday: tokensServed,
      averageWaitTime: queue.avgWaitTime, // could be dynamic but static for now
      currentQueueLength: waitingTokens.length,
      nextTokens: waitingTokens.slice(0, 5) // Send next 5 for the dashboard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
