const Discord = require("discord.js");
const Constants = require("../helpers/constants");

const cooldownedUsers = new Discord.Collection();

module.exports = class {

    constructor (client) {
        this.client = client;
    }

    async run (message) {

        if (message.partial || message.channel.partial) return;

        const startAt = Date.now();
        
        if (!message.guild || message.author.bot) return;

        const [
            guildSettings,
            guildSubscriptions
        ] = await Promise.all([
            this.client.mongodb.fetchGuildSettings(message.guild.id),
            this.client.mongodb.fetchGuildSubscriptions(message.guild.id)
        ]);
        message.guild.settings = guildSettings;
        const isPremium = guildSubscriptions.some((sub) => new Date(sub.expiresAt).getTime() > (Date.now()-3*24*60*60*1000));
        const aboutToExpire = isPremium && !(guildSubscriptions.some((sub) => new Date(sub.expiresAt).getTime() > (Date.now() + 5 * 24 * 60 * 60000)));

        const data = {
            settings: guildSettings,
            color: Constants.Embed.COLOR,
            footer: aboutToExpire ? "Attention, your Ayami subscription is about to expire!" : Constants.Embed.FOOTER
        };

        if (message.content.match(new RegExp(`^<@!?${this.client.user.id}>( |)$`))) return message.reply(message.translate("misc:PREFIX", {
            prefix: guildSettings.prefix
        }));

       
        if (!message.content.toLowerCase().startsWith(guildSettings.prefix)){
            return;
        }

        
        const args = message.content.slice(guildSettings.prefix.length).trim().split(/ +/g);
      
        const command = args.shift().toLowerCase();

       
        const cmd = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));

        // If no command found, return;
        if (!cmd) return;
        else message.cmd = cmd;

        const permLevel = await this.client.getLevel(message);

        if (!isPremium && permLevel < 4){
            return message.sendT("misc:NEED_UPGRADE", {
                username: message.author.username,
                discord: Constants.Links.DISCORD,
                emote: Constants.Emojis.UPGRADE
            });
        }

        if (data.settings.cmdChannel && (message.channel.id !== data.settings.cmdChannel) && permLevel < 1){
            message.delete().catch(() => {});
            return message.author.send(message.translate("misc:WRONG_CHANNEL", {
                channel: `<#${data.settings.cmdChannel}>`
            })).catch(() => {});
        }

        if (!cmd.conf.enabled){
            return message.error("misc:COMMAND_DISABLED");
        }

        /* Client permissions */
        const neededPermissions = [];
        cmd.conf.clientPermissions.forEach((permission) => {
            if (!message.channel.permissionsFor(message.guild.me).has(permission)) {
                neededPermissions.push(permission);
            }
        });
        if (neededPermissions.length > 0) {
            return message.error("misc:BOT_MISSING_PERMISSIONS", {
                permissions: neededPermissions.map((p) => "`"+p+"`").join(", ")
            });
        }

        
        if (permLevel < cmd.conf.permLevel){
            return message.error("misc:USER_MISSING_PERMISSIONS", {
                level: this.client.permLevels[cmd.conf.permLevel].name
            });
        }
        
        const userKey = `${message.author.id}${message.guild.id}`;
        const cooldownTime = cooldownedUsers.get(userKey);
        const currentDate = parseInt(Date.now()/1000);
        if (cooldownTime) {
            const isExpired = cooldownTime <= currentDate;
            const remainingSeconds = cooldownTime - currentDate;
            if (!isExpired) {
                return message.sendT("misc:COOLDOWNED", {
                    remainingSeconds,
                    emote: "<:atlanta_time:598169056125911040>"
                });
            }
        }

        const cooldown = cmd.conf.cooldown(message, args);
        cooldownedUsers.set(userKey, cooldown + currentDate);

        this.client.log(`${message.author.username} (${message.author.id}) ran command ${cmd.help.name} (${Date.now()-startAt}ms)`, "cmd");

        this.client.commandsRan++;
      
        cmd.run(message, args, data);

    }

};
