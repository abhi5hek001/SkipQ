const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const queueRoutes = require('./routes/queue.routes');
const vendorRoutes = require('./routes/vendor.routes');

app.use('/api/queue', queueRoutes);
app.use('/api/vendor', vendorRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SkipQ Backend running on port ${PORT}`);
});
