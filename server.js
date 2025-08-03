const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    cors: {
      origin: dev ? ["http://localhost:3000"] : false,
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join-room', (roomId) => {
      socket.join(roomId)
      console.log(`User ${socket.id} joined room ${roomId}`)
    })

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId)
      console.log(`User ${socket.id} left room ${roomId}`)
    })

    socket.on('send-message', (data) => {
      console.log('Message received:', data)
      socket.to(data.chatRoomId).emit('new-message', data)
      socket.emit('message-sent', data)
    })

    socket.on('typing', (data) => {
      socket.to(data.chatRoomId).emit('user-typing', {
        userId: data.userId,
        userName: data.userName,
        chatRoomId: data.chatRoomId
      })
    })

    socket.on('stop-typing', (data) => {
      socket.to(data.chatRoomId).emit('user-stop-typing', {
        userId: data.userId,
        chatRoomId: data.chatRoomId
      })
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
    })
  })

  server
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})