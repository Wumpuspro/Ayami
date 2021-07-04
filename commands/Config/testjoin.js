const Command = require("../../structures/Command.js"),
    Discord = require("discord.js"),
    Constants = require("../../helpers/constants");

module.exports = class extends Command {
    constructor (client) {
        super(client, {
            name: "testjoin",
            enabled: true,
            aliases: [],
            clientPermissions: [ "EMBED_LINKS" ],
            permLevel: 2
        });
    }

    async run (message, args, data) {

        const guildPlugins = await this.client.database.fetchGuildPlugins(message.guild.id);
        const plugin = guildPlugins.find((p) => p.pluginName === "join")?.pluginData;
   
        const embed = new Discord.MessageEmbed()
            .setTitle(message.translate("config/testjoin:TITLE"))
            .setDescription(message.translate("config/testleave:DESCRIPTION"))
            .addField(message.translate("config/testleave:ENABLED_TITLE"), (plugin?.enabled ? message.translate("config/testjoin:ENABLED_YES_CONTENT", {
                prefix: message.guild.settings.prefix,
                success: Constants.Emojis.SUCCESS
            }) : message.translate("config/testjoin:ENABLED_NO_CONTENT", {
                prefix: message.guild.settings.prefix,
                success: Constants.Emojis.SUCCESS
            })))
            .addField(message.translate("config/testleave:MESSAGE"), (plugin?.mainMessage || message.translate("config/testjoin:ENABLED_YES_CONTENT", {
                prefix: message.guild.settings.prefix
            })))
            .addField(message.translate("config/testleave:CHANNEL_TITLE"), (plugin?.channel ? `<#${plugin.channel}>` : message.translate("config/testjoin:CHANNEL_CONTENT", {
                prefix: message.guild.settings.prefix
            })))
            .setThumbnail(message.author.avatarURL())
            .setColor(data.color)
            .setFooter(data.footer)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
        
        if (plugin?.enabled && plugin.mainMessage && plugin.channel && message.guild.channels.cache.get(plugin.channel)){
            message.guild.channels.cache.get(plugin.channel).send(
                this.client.functions.formatMessage(
                    plugin.mainMessage,
                    message.member,
                    1,
                    (message.guild.settings.language || "english").substr(0, 2),
                    {
                        inviter: this.client.user,
                        inviterData: {
                            regular: 1,
                            fake: 0,
                            bonus: 0,
                            leaves: 0
                        },
                        invite: {
                            code: "436SPZX",
                            url: "https://discord.gg/ownerscm",
                            uses: 1,
                            channel: message.channel
                        }
                    }
                )
            ).catch((e) => {
                console.log(e);
                return message.error("misc:CANNOT_SEND");
            });
        }
    }
};
