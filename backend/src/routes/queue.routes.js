const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Join Queue
router.post('/join', async (req, res) => {
  const { vendorId } = req.body;
  try {
    let queue = await prisma.queue.findFirst({ where: { vendorId: Number(vendorId) } });
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found for this vendor' });
    }

    const position = queue.totalTokens + 1;
    const tokenNumber = `${queue.prefix}${position}`;

    const token = await prisma.token.create({
      data: {
        queueId: queue.id,
        tokenNumber,
        position,
      }
    });

    await prisma.queue.update({
      where: { id: queue.id },
      data: { totalTokens: position }
    });

    req.io.emit('queue_updated', { vendorId: queue.vendorId, queueId: queue.id });
    req.io.emit('new_token', { token });

    res.json({ token, message: 'Successfully joined the queue', feePaid: 5 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Queue Status
router.get('/status/:vendorId', async (req, res) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: { vendorId: Number(req.params.vendorId) },
      include: {
        vendor: true
      }
    });

    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const peopleAhead = queue.totalTokens - queue.currentToken;
    const estimatedWaitTime = peopleAhead * queue.avgWaitTime; // in seconds

    res.json({
      currentToken: queue.currentToken > 0 ? `${queue.prefix}${queue.currentToken}` : 'None',
      peopleAhead: peopleAhead > 0 ? peopleAhead : 0,
      estimatedWaitTime,
      queue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel Ticket
router.post('/cancel', async (req, res) => {
  const { tokenId } = req.body;
  try {
    const token = await prisma.token.update({
      where: { id: Number(tokenId) },
      data: { status: 'CANCELLED' }
    });
    req.io.emit('queue_updated', { queueId: token.queueId });
    res.json({ message: 'Token cancelled perfectly', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
