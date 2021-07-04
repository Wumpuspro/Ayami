  
const { ShardingManager } = require("discord.js");
const manager = new ShardingManager("./ayami.js", {
    token: require("./config").token,
    totalShards: require("./config").shardCount,
    shardArgs: [ ...process.argv, ...[ "--sharded" ] ]
});

const log = require("./helpers/logger");
log("Ayami has been started! 🚀\n");

manager.spawn();
