import { REST, Routes } from 'discord.js';
import { config } from '../backend/config';
import { commands } from './commands';

const commandsData = Object.values(commands).map(command => command.data);

const rest = new REST({ version: '10' }).setToken(config.botToken);

type DeployCommandsProps = {
    guildId: string;
};

export async function deployCommands({ guildId }: DeployCommandsProps) {
    try {
        console.log("Started refreshing application (/) bot.");
        console.log("Commands Data: ", commandsData)

        await rest.put(
            Routes.applicationGuildCommands(config.discordClientId, guildId),
            { body: commandsData },
        );

        console.log("Successfully reloaded application (/) bot.");
    } catch (error) {
        console.error(error);
    }
}