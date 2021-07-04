const Command = require("../../structures/Command.js");
const Constants = require("../../helpers/constants");

module.exports = class extends Command {
    constructor (client) {
        super(client, {
            name: "start-trial",
            enabled: true,
            aliases: [ "starttrial" ],
            clientPermissions: [],
            permLevel: 4
        });
    }

    async run (message, args) {

        const force = message.content.includes("-f");

        let guildID = args[0];
        if (!guildID) return message.error("Please specify a valid guild!");

        if (guildID.match(/(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com)|discordapp\.com\/invite)\/.+[a-zA-Z\d]/)){
            const invite = await this.client.fetchInvite(guildID);
            guildID = invite.channel.guild.id;
        }

        if (!args[1]) return message.error("Please specify a valid user!");
        const user = message.mentions.users.first() || await this.client.users.fetch(args[1]) || message.guild.members.cache.find((m) => `${m.user.username}#${m.user.discriminator}` === args[1])?.user;
        if (!user) return message.error(`I wasn't able to find a user for \`${args[1]}\``);

        const guildSubscriptions = await this.client.database.fetchGuildSubscriptions(guildID);
        const guildNames = await this.client.shard.broadcastEval((client, guildID) => {
            const guild = client.guilds.cache.get(guildID);
            if (guild) return guild.name;
        }, { context: guildID });
        const guildNameFound = guildNames.find((r) => r);
        const guildName = guildNameFound || guildID;

        if (guildSubscriptions.length > 0){
            if (!force) return message.error(`**${guildName}** has already used the trial period or has already paid.`);
        }

        const createdAt = new Date();

        const currentSubscription = guildSubscriptions.find((sub) => sub.subLabel === "Trial Version");
        let subscription = currentSubscription;

        if (!subscription) {
            subscription = await this.client.mongodb.createGuildSubscription(guildID, {
                expiresAt: new Date(Date.now()+(7*24*60*60*1000)),
                createdAt,
                guildsCount: 1,
                subLabel: "Trial Version"
            });
        } else await this.client.mongodb.updateGuildSubscription(subscription.id, guildID, "expiresAt",
            new Date((new Date(subscription.expiresAt).getTime() > Date.now() ? new Date(subscription.expiresAt).getTime() : Date.now()) + 7 * 24 * 60 * 60 * 1000).toISOString()
        );

        await this.client.mongodb.createSubscriptionPayment(subscription.id, {
            modDiscordID: message.author.id,
            payerDiscordID: user.id,
            payerDiscordUsername: user.tag,
            modID: message.author.id,
            amount: 0,
            type: "trial_activation",
            createdAt
        });

        const expiresAt = this.client.functions.formatDate(new Date(subscription.expiresAt), "MMM DD YYYY", message.guild.settings.language);
        message.channel.send(`${Constants.Emojis.SUCCESS} | Server **${guildName}** is now premium for 7 days (end on **${expiresAt}**) :rocket:`);

    }
};
