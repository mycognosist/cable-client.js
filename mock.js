/* translation layer between old cabal-client api and the new library cable-client. 
 * this allows cabal-cli to operate on `cable-client` without needing to change a cabal-cli instance :) */
const EventEmitter = require("events").EventEmitter
const CableClient = require("./cable-client.js")

const cableclient = new CableClient()

class User {
  constructor(key, name) {
    this.name = name
    this.key = key
  }
  isAdmin() { return false }
  isModerator() { return false }
  isHidden() { return false }
}

class CabalDetails extends EventEmitter {
  constructor() {
    super()
    this.key = "a-cabal-key"
    this.statusMessages = []
    this.chat = {"default": []}
    this.cc = cableclient
    this.showIds = false
    this.channels = ["default"]
    this.chindex = 0
    this.topics = {"default": "placeholder topic"}
    this.core = { adminKeys: [], modKeys: [] }
  }

  getChat(cb) {
    this.cc.getChat(this.getCurrentChannel(), {}, cb)
  }

  getTopic() { return this.topics[this.getCurrentChannel()] }
  focusChannel(ch) {
    this.chindex = this.channels.indexOf(ch)
    this.emit("update", this)
  }
  getLocalName() { 
    this.cc.localUser.name
  }
  getChannels() { return this.channels }
  getCurrentChannel() { return this.channels[this.chindex] }
  isChannelPrivate(ch) { return false }
  getUsers() { 
    const key = this.cc.localUser.key
    const users = {}
    users[key] = this.cc.localUser
    return users
  }
  getChannelMembers() { return [this.cc.localUser] }
  addStatusMessage(m) { 
    this.statusMessages.push(m) 
    this.chat[this.getCurrentChannel()].push({ 
      key: this.cc.localUser.key, 
      value: { 
        timestamp: +(new Date()),
        type: "status",
        content: {
          text: m.text
        }
      }
    })
  }
  processLine(line) {
    if (line.length === 0) { return }
    if (line.startsWith("/")) {
      const delim = line.indexOf(" ")
      const command = line.slice(1, delim)
      const value = line.slice(delim)
      switch (command) {
        case "nick":
        case "name":
          this.cc.setName(value, () => {
            this.emit("update", this)
          })
          return
          break
        case "j":
        case "join":
          if (!this.channels.includes(value)) {
            this.channels.push(value)
            this.chat[value] = []
          }
          this.currentChannel = value
          break
        case "topic":
          this.topics[this.getCurrentChannel()] = value
          break
      }
      this.emit("update", this)
      return
    }
    // it was a chat message
    this.cc.postText(line, this.getCurrentChannel())
    // this.chat[this.getCurrentChannel()].push({ 
    //   key: this.cc.localUser.key, 
    //   value: { 
    //     timestamp: +(new Date()),
    //     type: "chat/text",
    //     content: {
    //       text: line
    //     }
    //   }
    // })
    setTimeout(() => {
      this.emit("update", this)
    }, 40)
  }
  publishMessage() { }
}

class Client {
  constructor() {
    this.details = new CabalDetails()
    this.cabals = []
    this.cabalKeys = []
  }
  getJoinedChannels() { return ["default"] }

  /* methods where we punt to cabal details */
  getUsers() { return this.details.getUsers() }
  getMessages(opts, cb) { this.details.getChat(cb) }
  focusChannel(ch) { this.details.focusChannel(ch) }

  /* static methods */
  static getDatabaseVersion () { return "v1.3.37" }
  static getCabalDirectory() { return "/home/cblgh/code/cabal-club/grant-work-2022/cable-client/cabal-test" }

  /* variations of the same: getting the cabal instance */
  // for cable-client, we'll only operate on a single cabal 
  cabalToDetails () { return this.getCurrentCabal() }
  createCabal() { return this.details }
  getDetails (key) { return this.details }
  getCurrentCabal() { return this.details }
  focusCabal() { return this.details }
  _getCabalByKey(key) { return this.details }

  getCabalKeys() { return [this.details.key] }

  /* unimplemented/touched methods */
  getNumberUnreadMessages() { return 0 }
  getMentions() { return [] }
  markChannelRead(ch) { }
  addCabal(key) {}
  getCommands() {}
}

module.exports = {
  Client, 
  CabalDetails
}
