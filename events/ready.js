module.exports = class {
    constructor (client) {
        this.client = client;
    }

    
    async run () {

        const client = this.client;
       
        if(!process.argv.includes("--uncache")) await this.client.wait(1000);
        let invites = {};
        let startAt = Date.now();
        this.client.fetching = true;

        await this.client.functions.asyncForEach(this.client.guilds.cache.array(), async (guild) => {
            let i = process.argv.includes("--uncache") ? new Map() : (guild.me.hasPermission("MANAGE_GUILD") ? await guild.fetchInvites().catch(() => {}) : new Map());
            invites[guild.id] = i || new Map();
        });
        this.client.invitations = invites;
        this.client.fetched = true;
        this.client.fetching = false;
        if(this.client.shard.ids.includes(0)) console.log("=================================================");
        this.client.user.setPresence({ status: "online", activity:{name: `@Ayami - 1.0.0 | Shard: ${this.client.shard.ids[0]} | type +help`, type: "PLAYING" }});
        setInterval(() => {
            this.client.user.setPresence({ status: "online", activity:{name: `@Ayami - 1.0.0 | Shard: ${this.client.shard.ids[0]} | type +help `, type: "PLAYING" }});
        }, 60000*60);
        console.log(`\x1b[32m%s\x1b[0m`, `SHARD [${this.client.shard.ids[0]}]`, "\x1b[0m", `Invitations retrieved in  ${Date.now() - startAt} ms.`);
        console.log("=================================================");
        if(this.client.shard.ids.includes(this.client.shard.count-1)){
            console.log("Ready. Saved as "+this.client.user.tag+".Some statistics:\n");
            this.client.shard.broadcastEval(() => {
                console.log(`\x1b[32m%s\x1b[0m`, `SHARD [${this.shard.ids[0]}]`, "\x1b[0m", `Serving ${this.users.cache.size} members at ${this.guilds.cache.size} servers.`);
            });
        }

        if(this.client.shard.ids.includes(0) && !this.client.spawned){
            this.client.dash.load(this.client);
        }
        

    }
};
