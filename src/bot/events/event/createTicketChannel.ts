import {
    ButtonInteraction,
    ChannelType,
    PermissionFlagsBits,
    Webhook,
    WebhookClient,
    EmbedBuilder,
    ButtonBuilder, ButtonStyle, ActionRowBuilder
} from "discord.js";
import { Database} from "../../../libs/database";
import {channel} from "node:diagnostics_channel";

const db = Database();



export default async function createTicketChannel(interaction:ButtonInteraction) {
    const openTickets = await db.select("storage", "openTicketsChannel");

    const botMember = interaction.guild?.members.cache.get(interaction.client.user?.id || '');

    const openNewTicket = await interaction.guild?.channels.create({
        name: interaction.user.username,
        type: ChannelType.GuildText,
        // @ts-ignore
        parent: openTickets.data,
        permissionOverwrites: [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: botMember?.id || '',
                allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel]
            }
        ]
    })

    if (openNewTicket) {
        const webhook = await openNewTicket.createWebhook({
            name: "Ticket Webhook",
        });

        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });

        const closeTicketButton = new ButtonBuilder()
            .setCustomId("close_ticket_channel")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(closeTicketButton);

        const embed = new EmbedBuilder()
            .setTitle("New Ticket")
            .setDescription(`Ticket created by ${interaction.user.username}`)
            .addFields({
                name: "\u200b",
                value: "Please inform staff of your issue. \n\n Someone will be with you shortly\n\u200b",
            })
            .setColor("#8645b3")
            .setTimestamp(new Date())
            .setFooter({text: "Ticket Bot"});

        await webhookClient.send({
            username: "Ticket Bot",
            embeds: [embed],
            components: [actionRow]
        });

        return interaction.reply({ content: `Ticket Created: <#${openNewTicket.id}>`, ephemeral: true });
    } else {
        return interaction.reply({ content: 'Error creating ticket channel', ephemeral: true });
    }
    return interaction.reply({content: `Ticket Created: <#${openNewTicket?.id}>`, ephemeral: true});

}