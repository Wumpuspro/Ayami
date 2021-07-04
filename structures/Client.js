const { Client, Collection, Intents } = require("discord.js"),
    util = require("util"),
    path = require("path");

const DatabaseHandler = require("@manage-invite/manage-invite-db-client");


class Ayami extends Client {

    constructor () {
        super({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MEMBERS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
                Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
                Intents.FLAGS.GUILD_INVITES,
                Intents.FLAGS.DIRECT_MESSAGES
            ],
            partials: [ "REACTION", "MESSAGE", "CHANNEL", "GUILD_MEMBER" ],
            allowedMentions: {
                parse: ["users", "roles", "everyone"],
                repliedUser: true
            }
        });
        
        this.config = require("../config"); 
        this.permLevels = require("../helpers/permissions"); 
        this.enabledLanguages = require("../languages.json"); 
        
        this.commands = new Collection(); 
        this.aliases = new Collection(); 
        
        this.log = require("../helpers/logger");
        this.functions = require("../helpers/functions"); 
        this.wait = util.promisify(setTimeout); 
        
        this.invitations = {};
        this.fetched = false;
        this.fetching = false;
        
        this.database = new DatabaseHandler(this.config.mongodb, this.log);
        
        this.ipc = require("../helpers/ipc-client");
        this.states = {};
        this.spawned = false;
        this.knownGuilds = [];
        
        this.syncRanksTasks = {};
       
        this.guildsCreated = 0;
        this.guildsDeleted = 0;
        this.commandsRan = 0;
        this.pgQueries = 0;
        
        this.waitingForVerification = [];
    }

    
    loadCommand (commandPath, commandName) {
        try {
            const props = new (require(`.${commandPath}${path.sep}${commandName}`))(this);
            props.conf.location = commandPath;
            if (props.init){
                props.init(this);
            }
            this.commands.set(props.help.name, props);
            props.conf.aliases.forEach((alias) => {
                this.aliases.set(alias, props.help.name);
            });
            return false;
        } catch (e) {
            console.error(e);
            return `Unable to load command ${commandName}: ${e}`;
        }
    }

  
    async unloadCommand (commandPath, commandName) {
        let command;
        if (this.commands.has(commandName)) {
            command = this.commands.get(commandName);
        } else if (this.aliases.has(commandName)){
            command = this.commands.get(this.aliases.get(commandName));
        }
        if (!command){
            return `The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Try again!`;
        }
        if (command.shutdown){
            await command.shutdown(this);
        }
        delete require.cache[require.resolve(`.${commandPath}${path.sep}${commandName}.js`)];
        return false;
    }

    async resolveMember (search, guild){
        let member = null;
        if (!search || typeof search !== "string") return;
        
        if (search.match(/^<@!?(\d+)>$/)){
            const id = search.match(/^<@!?(\d+)>$/)[1];
            member = await guild.members.fetch(id).catch(() => {});
            if (member) return member;
        }
        
        if (search.match(/^!?([^#]+)#(\d+)$/)){
            await guild.members.fetch();
            member = guild.members.cache.find((m) => m.user.tag === search);
            if (member) return member;
        }
        member = await guild.members.fetch(search).catch(() => {});
        return member;
    }

    async resolveUser (search){
        let user = null;
        if (!search || typeof search !== "string") return;
        // Try ID search
        if (search.match(/^<@!?(\d+)>$/)){
            const id = search.match(/^<@!?(\d+)>$/)[1];
            user = this.users.fetch(id).catch(() => {});
            if (user) return user;
        }
        // Try username search
        if (search.match(/^!?([^#]+)#(\d+)$/)){
            const username = search.match(/^!?([^#]+)#(\d+)$/)[0];
            const discriminator = search.match(/^!?([^#]+)#(\d+)$/)[1];
            user = this.users.cache.find((u) => u.username === username && u.discriminator === discriminator);
            if (user) return user;
        }
        user = await this.users.fetch(search).catch(() => {});
        return user;
    }

    getLevel (message) {
        let permlvl = 0;
        const permOrder = this.permLevels.slice(0).sort((p, c) => p.level < c.level ? 1 : -1);
        while (permOrder.length) {
            const currentLevel = permOrder.shift();
            if (message.guild && currentLevel.guildOnly) continue;
            if (currentLevel.check(message)) {
                permlvl = currentLevel.level;
                break;
            }
        }
        return permlvl;
    }
}

module.exports = Ayami;
