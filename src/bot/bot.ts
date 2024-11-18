import { ChatInputCommandInteraction, Client, GuildChannel} from 'discord.js';
import {deployCommands} from "./deploy-commands";
import { commands } from "./commands";
import { config } from '../backend/config';
import { events } from "./events/events";

console.log("Starting Up")

const client = new Client({
    intents: ['Guilds', 'GuildMessages', "DirectMessages", "MessageContent"],
});

client.once('ready', () => {
    console.log('Ready!');
});

client.on("guildCreate", async (guild) => {
    await deployCommands({ guildId: guild.id });
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const {commandName} = interaction;
        console.log("Command Name: ", commandName);
        let subcommand;
        try {
            subcommand = interaction.options.getSubcommand(false);
        } catch (error) {
            subcommand = null;
        }
        if (commands[commandName as keyof typeof commands]) {
            await commands[commandName as keyof typeof commands].execute(interaction as ChatInputCommandInteraction);
        }
    } else if (interaction.isButton()) {
        switch (interaction.customId) {
            case "create_ticket_channel":
                await events.createTicketChannel(interaction);
                break;
            case "close_ticket_channel":
                await events.closeTicketChannel(interaction);
                break;
            case "create_ticket_thread":
                await events.createTicketThread(interaction);
                break;
            case "close_ticket_thread":
                await events.closeTicketThread(interaction);
                break;
        }
    }

});

if (config.botToken && config.discordClientId) {
    client.login(config.botToken).then(r => console.log("Logged in as:", client.user?.username));
} else {
    console.error("Bot Token or Client ID not found in config");
}

