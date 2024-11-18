import {
    ChatInputCommandInteraction,
    GuildMember,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder
} from "discord.js";
import {deployCommands} from "../deploy-commands";
import {config} from "../../backend/config";


const requiredRoleIds = JSON.parse(config.discordAdmins) || [];


const deploy = new SlashCommandSubcommandBuilder()
    .setName('deploy')
    .setDescription('Deploy bot')

const test = new SlashCommandSubcommandBuilder()
    .setName('test')
    .setDescription('Test command')

export const data = new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin bot')
    .addSubcommand(deploy)
    .addSubcommand(test)
    .setDefaultMemberPermissions(0x0000010000000000)


export async function execute(interaction: ChatInputCommandInteraction) {
    try {

        const member = interaction.member as GuildMember;
        const memberRoles = member.roles.cache.map(role => role.name);
        const hasPermission = requiredRoleIds.some((roleName: string) => memberRoles.includes(roleName));

        if (!hasPermission) {
            console.log("Member does not have permission");
            return interaction.reply({content: "You do not have permission to run this command", ephemeral: true});
        }

        const subcommand = interaction.options.getSubcommand();
        console.log("Subcommand:", subcommand);
        switch (subcommand) {
            case "deploy":
                console.log("Deploying Commands");
                if (interaction.guildId) {
                    await deployCommands({guildId: interaction.guildId})
                        .then(() => {
                            console.log("Deployed Commands");
                            return interaction.reply({content: "Deployed Commands", ephemeral: true});
                        })
                        .catch((error) => {
                            console.error("Error Deploying Commands:", error);
                            return interaction.reply({content: "Error Deploying Commands", ephemeral: true});
                        })
                }
                break;
            case "test":
                console.log("Testing");
                return interaction.reply({content: "Test Successful", ephemeral: true});
            default:
                console.log("Default");
                return interaction.reply({content: "Invalid Subcommand", ephemeral: true});
        }


    } catch (error) {
        console.error("Interaction Error:", error);
        if (!interaction.replied) {
            console.log("Error")
            return interaction.reply({content: "An error occurred while processing the command", ephemeral: true})
        }
    }
}