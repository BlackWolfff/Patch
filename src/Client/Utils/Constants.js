module.exports = {
    author: "BlackBird#9999",
    failCommand: "415912144308273152",
    LOGGER_SPACING: 75,
    mongoUrl: "mongodb://localhost:27017/",
    asyncServices: ["Commands","MongoDB", "DiscordJS"], // API in future
    statusChangeDelay: 600000, // 5 min,
    inviteLink: "soon",
    webURL: "https://soon.lol/"
}

module.exports.permissions = {
    "FULL_ADMIN": 0b1 //??
},

module.exports.defaults = {
    guildSettings: {
        prefix: "!",
        tags: {
            dicc: "Yes i like",
            try: "Author: $author#\nNo mention: $authornick#\nchannel: $channel#\nparams: $params#\nparam2: $param2#"
        }
    }
}