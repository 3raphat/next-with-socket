import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { Server } from 'socket.io'

const port = parseInt(process.env.PORT || '3000')
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handler(req, res, parsedUrl)
  })

  const io = new Server(httpServer)

  io.on('connection', (socket) => {
    console.log('a user connected', socket.id)
    socket.emit('status', 'connected')

    const connectedClients = io.engine.clientsCount
    io.emit('clientCount', connectedClients)

    socket.on('disconnect', () => {
      console.log('a user disconnected', socket.id)

      const remainingClients = io.engine.clientsCount
      io.emit('clientCount', remainingClients)
    })

    // Periodic ping to ensure connection is alive
    const pingInterval = setInterval(() => {
      socket.emit('ping')
    }, 30000)

    socket.on('disconnect', () => {
      clearInterval(pingInterval)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(
        `> Server listening at http://localhost:${port} as ${
          dev ? 'development' : process.env.NODE_ENV
        }`
      )
    })
})
