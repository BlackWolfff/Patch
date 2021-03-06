const MongoClient = require('mongodb').MongoClient;
const { mongoUrl, defaults  } = require("../Utils/Constants.js")

class FakeManager { // for testing when i'm too lazy to start mongoDB
    destroy() { return Promise.resolve(true)}
    collection() { return {
        insertOne() { return Promise.resolve(false) }
    } }
    logCommand() { return Promise.resolve(true) }
    updateSettings() { return Promise.resolve(true) }
    getSettings() { return Promise.resolve(false) }
    close() { return false }
    getUserPermissions() { return Promise.resolve(false) }
    setUserPermissions() { return Promise.resolve(true) }
    getUserAccount(id) { return Promise.resolve(Object.assign({}, { id }, defaults.userAccount)) }
    findResponse() { return Promise.resolve(null) }
    addResponse() { return Promise.resolve(false) }
}

// let's try having everything in one db :thonk:
class MongoManager {
    constructor(db) {
        this.mongodb = db
        this.db = db.db("patch")
        this.collections = {
            "cmdLogs": {
                //db: "logs",
                collection: "commands"
            },
            "guildSettings": {
                //db: "settings",
                collection: "guild"
            },
            "userSettings": {
                //db: "settings",
                collection: "user"
            },
            "userAccounts": {
                //db: "accounts",
                collection: "user"
            },
            "globalResponses": {
                //db: "responses",
                collection: "global"
            },
            "userResponses": {
                //db: "responses",
                collection: "user"
            },
            "guildResponses": {
                //db: "responses",
                collection: "guild"
            }
        }
    }

    destroy() {
        return this.mongodb.close()
    }

    collection(name) {
        if(!this.collections.hasOwnProperty(name)) return console.error("Tried to use collection that doesn't exists!")
        const coll = this.collections[name]
        return this.db.collection(coll.collection)
        //return this.db.db(coll.db).collection(coll.collection)
    }

    logCommand(cmd, msg) {
        if(msg.channel.type === "text") {
            return this.collection("cmdLogs").insertOne({
                command: cmd.name,
                user: {
                    id: msg.author.id,
                    username: msg.author.username,
                    discriminator: msg.author.discriminator
                },
                guild: {
                    id: msg.guild.id,
                    name: msg.guild.name
                },
                channel: {
                    id: msg.channel.id,
                    name: msg.channel.name
                },
                params: msg.params,
                timestamp: msg.createdTimestamp
            })
        } else {
            return this.collection("cmdLogs").insertOne({
                command: cmd.name,
                user: {
                    id: msg.author.id,
                    username: msg.author.username,
                    discriminator: msg.author.discriminator
                },
                guild: null,
                channel: "DM",
                params: msg.params,
                timestamp: msg.createdTimestamp
            })
        }
    }

    getSettings(id, type = "guild") {
        return this.collection(type+"Settings").findOne({ id }).then(settings => {
            if(!settings) return null
            // holey object are bad objects
            // delete settings.id
            // delete settings._id
            return settings
        })
    }

    setUserPermissions(id, permissions) {
        return this.collection("userSettings").updateOne({ id }, { $set: { permissions } })
    }

    setMemberPermissions(id, guildID, permissions) {
        return this.collection("userSettings").updateOne({ id }, { $set: {
            guildPermissions: {
                [guildID]: permissions
            }
        }})
    }

    getUserAccount(id) {
        return this.collection("userAccounts").findOne({ id }).then(acc => {
            if(!acc) {
                acc = { id, currency: 0 }
                this.collection("userAccounts").insertOne(acc)
                return { currency: 0 }
            }
            // delete acc._id
            // delete acc.id
            return acc
        })
    }

    async findResponse(msg, authorID, guildID) {
        const global = await this.collection("globalResponses").findOne({
            query: msg
        })
        if(global) return global.responses
        if(authorID) {
            const user = await this.collection("userResponses").findOne({
                id: authorID,
                query: msg
            })
            if(user) return user.responses
        }
        if(guildID) {
            const guild = await this.collection("guildResponses").findOne({ 
                id: guildID,
                query: msg
            })
            if(guild) return guild.responses
        }
        return null
    }

    addResponse(query, responses, type = "global", id) {
        query = query.toLowerCase()
        if (type === "global") {
            return this.collection("globalResponses").updateOne({
                    $or: [
                        { query },
                        { responses }
                    ]
                }, {
                    $addToSet: {
                        query,
                        responses
                    }
                },
                { upsert: true }
            )
        }
        if(!id) throw new TypeError("No ID provided")
        if (type === "user" || type === "guild") {
            return this.collection(type+"Responses").updateOne({
                    $or: [
                        { id, query },
                        { id, responses }
                    ]
                }, {
                    $addToSet: {
                        query,
                        responses
                    },
                    $setOnInsert: {
                        id
                    }
                }, 
                { upsert: true }
            )
        }
        return null
    }
}

let manager = false

// eslint-disable-next-line no-unused-vars
module.exports = function(client) {
    if(!client.config.run.mongo) return Promise.resolve(new FakeManager()) // for testing..
    
    return new Promise((res, rej) => {
        if(manager) {
            console.warn("MongoDB manager is already created!")
            return res(manager)
        }
        

        console.loading("Connecting to mongoDB")
        MongoClient.connect(mongoUrl)
        .then(db => {
            console.ok("MongoDB connected!")
            manager = new MongoManager(db)
            res(manager)
        })
        .catch(err => {
            console.error(err)
            rej(err)
        })
    })

}
