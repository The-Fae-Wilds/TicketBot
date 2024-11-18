import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    WebhookClient
} from "discord.js";
import { config } from "../../../backend/config";
import { Database } from "../../../libs/database";

const db = Database();


export default async function createTicketThread(interaction:ButtonInteraction) {
    const user = interaction.user.id;
    const channel = await interaction.client.channels.fetch(interaction.channelId);

    if (channel && channel.type === ChannelType.GuildText ) {
        const thread = await channel.threads.create({
            name: `Ticket for ${interaction.user.username}`,
            autoArchiveDuration: 1440,
            type: ChannelType.GuildPrivateThread,
        });

        await thread.members.add(user);



        await interaction.reply({ content: "Ticket thread created.", ephemeral: true });

        const webhookidRow = await db.select("storage","webhookid")
        const webhookTokenRow = await db.select("storage","webhookToken")


        const webhookClent = new WebhookClient({id: webhookidRow.data, token: webhookTokenRow.data});

        const embed = new EmbedBuilder()
            .setTitle("Ticket Thread Created")
            .setDescription(`Ticket thread created for ${interaction.user.username}`)
            .setTimestamp();

        const closeTicketButton = new ButtonBuilder()
            .setCustomId("close_ticket_thread")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(closeTicketButton);

        await webhookClent.send({
            username: "Ticket Thread",
            embeds: [embed],
            components: [actionRow],
            threadId: thread.id
        });



    } else {
        return interaction.reply({ content: "Error: Channel not found.", ephemeral: true });
    }
}