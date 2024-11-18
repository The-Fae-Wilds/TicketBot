import {
    ChatInputCommandInteraction,
    GuildMember,
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    Webhook,
    WebhookClient,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    SlashCommandSubcommandBuilder
} from 'discord.js';
import {config} from '../../backend/config';
import {Database} from "../../libs/database"

const db = Database();

const channel = new SlashCommandSubcommandBuilder()
    .setName('channel')
    .setDescription('Sets up the bot to use channels in this server')
    .addStringOption(option => option.setName("open").setDescription("where to have open tickets").setRequired(true))
    .addStringOption(option => option.setName("closed").setDescription("where to have closed tickets").setRequired(true));

const thread = new SlashCommandSubcommandBuilder()
    .setName('thread')
    .setDescription('Sets up the bot to use threads in this server')
    .addStringOption(option => option.setName("category").setDescription("category for tickets channel").setRequired(true))
    .addStringOption(option => option.setName("channel").setDescription("Channel name for ticket threads").setRequired(true));

export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Sets up the bot in this server')
    .addSubcommand(channel)
    .addSubcommand(thread);

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const memberRoles = member.roles.cache.map(role => role.name);
    const requiredRoleIds = JSON.parse(config.discordAdmins || '[]');
    const hasPermission = requiredRoleIds.some((roleName: string) => memberRoles.includes(roleName));

    if (!hasPermission) {
        console.log(`${member} does not have permission`);
        return interaction.reply({content: 'You do not have permission to run this command', ephemeral: true});
    }

    const botMember = interaction.guild?.members.cache.get(interaction.client.user?.id || '');
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
        case "channel":
            const openTickets = interaction.options.getString('open');
            const closedTickets = interaction.options.getString('closed');

            try {
                const OpenTickets = await interaction.guild?.channels.create({
                    name: openTickets || "Open Tickets",
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: botMember?.id || '',
                            allow: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });

                const ClosedTickets = await interaction.guild?.channels.create({
                    name: closedTickets || "Closed Tickets",
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: botMember?.id || '',
                            allow: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });

                const openTicketsChannel = await interaction.guild?.channels.create({
                    name: "open-tickets",
                    type: ChannelType.GuildText,
                    parent: OpenTickets?.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: botMember?.id || '',
                            allow: [PermissionFlagsBits.SendMessages]
                        }
                    ]
                }) || "";

                if (openTicketsChannel) {
                    const webhook = await openTicketsChannel.createWebhook({
                        name: "Create Ticket",
                    })

                    const webhookId = webhook.id;
                    const webhookToken = webhook.token;
                    console.log(`Webhook ID: ${webhookId}, Token: ${webhookToken}`);


                    const webhookClient = new WebhookClient({id: webhookId, token: webhookToken});

                    const embed = new EmbedBuilder()
                        .setTitle("Create Ticket")
                        .setDescription("Use this to open a ticket with the staff")
                        .setTimestamp();

                    const createTicket = new ButtonBuilder()
                        .setCustomId("create_ticket_channel")
                        .setLabel("Create Ticket")
                        .setStyle(ButtonStyle.Success);

                    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(createTicket);

                    await webhookClient.send({
                        username: 'Create Ticket',
                        embeds: [embed],
                        components: [actionRow]
                    });

                    if (OpenTickets && ClosedTickets) {
                        db.insertStorage("openTicketsChannel", OpenTickets.id);
                        db.insertStorage("closedTicketsChannel", ClosedTickets?.id);
                    }

                    return interaction.reply({
                        content: `Created open tickets category: ${OpenTickets} and closed tickets category: ${ClosedTickets}`,
                        ephemeral: true
                    });
                } else {
                    return interaction.reply({content: 'Error creating open tickets channel', ephemeral: true});
                }

            } catch (error) {
                console.error('Error creating open tickets category:', error);
                return interaction.reply({content: 'Error creating open tickets category', ephemeral: true});
            }
        case "thread":
            const threadChannel = interaction.options.getString('channel') || "";

            try {
                console.log(`Thread Channel: ${threadChannel}`);

                const channel = await interaction.guild?.channels.create({
                    name: threadChannel,
                    type: ChannelType.GuildText,
                    parent: interaction.options.getString('category'),
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: botMember?.id || '',
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });


                if (channel) {
                    db.insertStorage("threadChannel", channel.id);
                    const webhook = await channel?.createWebhook({
                        name: "Create Ticket",
                    });

                    const webhookId = webhook.id;
                    const webhookToken = webhook.token;

                    db.insertStorage("webhookId", webhookId);
                    db.insertStorage("webhookToken", webhookToken);



                    const webhookClient = new WebhookClient({id: webhookId, token: webhookToken});

                    const embed = new EmbedBuilder()
                        .setTitle("Create Ticket")
                        .setDescription("Use this to open a ticket with the staff")
                        .setTimestamp();

                    const createTicket = new ButtonBuilder()
                        .setCustomId("create_ticket_thread")
                        .setLabel("Create Ticket")
                        .setStyle(ButtonStyle.Success);

                    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(createTicket);

                    await webhookClient.send({
                        username: 'Create Ticket',
                        embeds: [embed],
                        components: [actionRow]
                    });
                }

                return interaction.reply({content: `Thread channel set to ${threadChannel}`, ephemeral: true});
            } catch (error) {
                return interaction.reply({content: 'Error setting thread channel', ephemeral: true});
            }

    }

}