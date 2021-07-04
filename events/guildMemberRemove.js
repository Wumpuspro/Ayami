module.exports = class {
    constructor (client) {
        this.client = client;
    }

    async run (member) {

        const startAt = Date.now();
        let logMessage = "----------\n";

        // Prevent undefined left the server
        if (!member.user) {
            logMessage += "User not cached : fetched\n";
            member.user = await this.client.users.fetch(member.user.id);
        }
        logMessage += `Leave of ${member.user.tag} | (${member.id})\n`;
        if (!this.client.fetched) return;

        // Fetch guild and member data from the db
        const guildSubscriptions = await this.client.mongodb.fetchGuildSubscriptions(member.guild.id);
        const isPremium = guildSubscriptions.some((sub) => new Date(sub.expiresAt).getTime() > (Date.now()-3*24*60*60*1000));
        if (!isPremium) return;

        const fetchStartAt = Date.now();
        const [
            guildSettings,
            guildBlacklistedUsers,
            guildPlugins,
            guildAlerts,
            memberEvents
        ] = await Promise.all([
            this.client.mongodb.fetchGuildSettings(member.guild.id),
            this.client.mongodb.fetchGuildBlacklistedUsers(member.guild.id),
            this.client.mongodb.fetchGuildPlugins(member.guild.id),
            this.client.mongodb.fetchGuildAlerts(member.guild.id),
            this.client.mongodb.fetchGuildMemberEvents({
                userID: member.id,
                guildID: member.guild.id
            })
        ]);
        logMessage += `Fetch data: ${Date.now()-fetchStartAt}ms\n`;

        member.guild.settings = guildSettings;

        const lastJoinData = memberEvents.filter((j) => j.eventType === "join" && j.guildID === member.guild.id && j.userID === member.id && j.storageID === guildSettings.storageID).sort((a, b) => b.eventDate - a.eventDate)[0];
        
        logMessage += `Last join data : ${!!lastJoinData}\n`;

        const inviter = lastJoinData?.joinType === "normal" && lastJoinData.inviteData ? await this.client.resolveUser(lastJoinData.inviterID) : null;

        const inviterData = inviter ? await this.client.database.fetchGuildMember({
            userID: inviter.id,
            guildID: member.guild.id,
            storageID: guildSettings.storageID
        }) : null;
        const invite = lastJoinData?.inviteData;

        // Update member invites
        if (inviter){
            if (guildBlacklistedUsers.includes(inviter.id)) return;

            const inviterMember = member.guild.members.cache.get(inviter.id) ?? await member.guild.members.fetch({
                user: inviter.id,
                cache: true
            });

            const previousInviteCount = inviterData.invites;
            let newInviteCount = previousInviteCount;

            if (inviterData.notCreated) await this.client.database.createGuildMember({
                userID: inviter.id,
                guildID: member.guild.id,
                storageID: guildSettings.storageID
            });

            this.client.database.addInvites({
                userID: inviter.id,
                guildID: member.guild.id,
                storageID: guildSettings.storageID,
                number: 1,
                type: "leaves"
            });
            inviterData.leaves++;
            newInviteCount--;

            if (lastJoinData.joinFake) {
                this.client.mongodb.addInvites({
                    userID: inviter.id,
                    guildID: member.guild.id,
                    storageID: guildSettings.storageID,
                    number: -1,
                    type: "fake"
                });
                inviterData.fake--;
                newInviteCount++;
            }
            await this.client.mongodb.createGuildMemberEvent({
                userID: member.id,
                guildID: member.guild.id,
                eventType: "leave",
                eventDate: new Date(),
                storageID: guildSettings.storageID
            });

            if (previousInviteCount > newInviteCount) {
                const guildAlertNewCount = guildAlerts.find((alert) => alert.inviteCount === previousInviteCount && alert.type === "down");
                if (guildAlertNewCount) {
                    const alertMessage = this.client.functions.formatMessage(guildAlertNewCount.message, inviterMember, null, (guildSettings.language || "english").substr(0, 2), null, true, newInviteCount);
                    const alertChannel = this.client.channels.cache.get(guildAlertNewCount.channelID);
                    if (alertChannel) alertChannel.send(alertMessage);
                }
            }

        }

        const memberNumJoins = memberEvents.filter((e) => e.eventType === "join" && e.userID === member.id).length || 1;
        const leave = guildPlugins.find((p) => p.pluginName === "leave")?.pluginData;
        // Leave messages
        if (leave?.enabled && leave.mainMessage && leave.channel){
            logMessage += "Leave: true\n";
            const channel = member.guild.channels.cache.get(leave.channel);
            if (!channel) return;
            logMessage += "Leave: sent\n";
            const joinType = lastJoinData?.joinType;
            if (invite){
                const formattedMessage = this.client.functions.formatMessage(
                    leave.mainMessage,
                    member,
                    memberNumJoins,
                    (guildSettings.language || "english").substr(0, 2),
                    {
                        inviter,
                        inviterData,
                        invite
                    }
                );
                channel.send(formattedMessage);
            } else if (joinType === "vanity"){
                const formattedMessage = this.client.functions.formatMessage((leave.vanityMessage || member.guild.translate("misc:LEAVE_VANITY_DEFAULT")), member, (guildSettings.language || "english").substr(0, 2), null);
                channel.send(formattedMessage);
            } else if (joinType === "oauth"){
                const formattedMessage = this.client.functions.formatMessage((leave.oauth2Message || member.guild.translate("misc:LEAVE_OAUTH2_DEFAULT")), member, (guildSettings.language || "english").substr(0, 2), null);
                channel.send(formattedMessage);
            } else {
                const formattedMessage = this.client.functions.formatMessage((leave.unknownMessage || member.guild.translate("misc:LEAVE_UNKNOWN_DEFAULT")), member, (guildSettings.language || "english").substr(0, 2), null);
                channel.send(formattedMessage);
            }
        }
        logMessage += `Time: ${Date.now()-startAt}ms\n`;
        console.log(logMessage + "----------");

    }
};
