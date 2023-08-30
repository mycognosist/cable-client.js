const lpstream = require("length-prefixed-stream")
const b4a = require("b4a")
const net = require("net")
const debug = require("debug")("transport/tcp")
const EventEmitter = require("events").EventEmitter

class Network extends EventEmitter {
  constructor(opts) {
    super()
    if (!opts) { 
      opts = {} 
    }

    this.serve = opts.serve || false
    this.port = opts.port || 13331
    this.ip = opts.ip || "127.0.0.1"

    this.peers = []

    if (opts.serve) {
      this._startServer()
    } else {
      const socket = net.connect(this.port, this.ip)
      this._setupPeer(socket)
    }
  }

  _startServer() {
    const server = net.createServer(socket => {
      this._setupPeer(socket)
    })
    server.listen(this.port)
  }

  _setupPeer(socket) {
    const peer = { 
      id: (Math.random() + "").slice(2), 
      encode: lpstream.encode(), 
      decode: lpstream.decode(),
      socket
    }
    socket.pipe(peer.decode)
    peer.encode.pipe(socket)
    peer.decode.on("data", this._handleSocketData.bind(this))

    this.peers.push(peer)
    this.emit("peer-connected", socket)

    socket.on("end", () => {
      const index = this.peers.findIndex(p => p.id === peer.id)
      this.peers.splice(index, 1)
      debug("connection:end")
      this.emit("peer-disconnected", socket)
    })
  }

  _handleSocketData(msg) {
    const data = b4a.from(msg.toString("hex"), "hex")
    // debug("recieved from", msg.address)
    debug("data", data)
    this.emit("data", { address: "", data })
  }

  broadcast (data) {
    debug("broadcast data", data)
    this.peers.forEach(peer => {
      peer.encode.write(data)
    })
  }
}
module.exports = { Network }
