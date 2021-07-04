const { Permissions } = require("discord.js");

module.exports = [
    {
        level: 0,
        name: "User",
        check: () => true,
    },
    {
        level: 1,
        name: "Moderator",
        check: (message) => (message.guild ? message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) : false),
    },
    {
        level: 2,
        name: "Administrator",
        check: (message) => (message.guild ? message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) : false),
    },
    {
        level: 3,
        name: "Owner",
        check: (message) => (message.guild ? message.author.id === message.guild.ownerID : false),
    },
    {
        level: 4,
        name: "Bot moderator",
        check: (message) => {
            return (
                [
                    "852219497763045398", // Wumpus
                    "736573119866732605", // Shadow
                    "533955330829451275" // SaHil
                  
                ].includes(message.author.id)
                || (
                    message.client.guilds.cache.has(message.client.config.supportServer)
                        ? (
                            message.client.guilds.cache.get(message.client.config.supportServer).members.cache.get(message.author.id)
                                ? message.client.guilds.cache.get(message.client.config.supportServer).members.cache.get(message.author.id).roles.cache.has(message.client.config.modRole)
                                : false)
                        : false)
            );
        }
    },
    {
        level: 5,
        name: "Bot owner",
        check: (message) => message.client.config.owners.includes(message.author.id),
    }
];
