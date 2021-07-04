module.exports = class {

    constructor (client) {
        this.client = client;
    }

    async run (invite) {
        
        if (!this.client.fetched) return;
        if (!this.client.invitations[invite.guild.id]) return;
       
        this.client.invitations[invite.guild.id].set(invite.code, invite);
    }

};
