import {ButtonInteraction, Message, PermissionFlagsBits, TextChannel} from "discord.js";
import { Database } from "../../../libs/database";
import {config} from "../../../backend/config";

const db = Database();

export default async function closeTicketChannel(interaction: ButtonInteraction) {
    const channel = interaction.channel;

    if (channel) {
        const botMember = await interaction.guild?.members.fetch(interaction.client.user?.id || '');

        if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {

            const messages = await fetchMessages(channel.id, interaction);
            const { timestampOpen, firstUserId } = getFirstMessageDetails(messages);
            const firstUser = await interaction.guild?.members.fetch(firstUserId);
            const firstUsername = firstUser?.user.username;

            const usernames = await getUsernames(messages, interaction);

            const uri = await insertMessages(messages, firstUsername || "Unknown", usernames, timestampOpen);
            if (firstUser) {
                firstUser?.user.send(`Your ticket has been closed. You can view the chatlog here: https://${config.websiteHost}/chatlog/${uri}`)
            }

            await interaction.reply({ content: "Ticket has been closed and the channel deleted.", ephemeral: true });
            return channel.delete("Ticket closed by user request")
                .catch(console.error);
        } else {
            return interaction.reply({ content: "Error: Bot lacks the necessary permissions to delete the channel. \nPlease report this to an Admin", ephemeral: true });
        }
    } else {
        return interaction.reply({ content: "Error: Channel not found.", ephemeral: true });
    }
}

async function fetchMessages(channelId: string, interaction: ButtonInteraction) {
    const channel = await interaction.guild?.channels.fetch(channelId) as TextChannel;
    const messages = await channel?.messages.fetch();
    //@ts-ignore
    const messageData : Record<string, Record<string, { message: string, messageId: string, replyTo: null | { userId: string, messageId: string } }>> = {};

    let lastUserId: string | null = null;
    let lastMessageId: number | null = null;

    messages?.forEach((message: Message) => {

        const userId = message.author.id;
        const messageId = message.id;
        const timestamp = message.createdTimestamp;
        let replyTo = null;

        if(message.reference?.messageId) {
            const referenceMessage = messages.get(message.reference.messageId);
            console.log("Ref Message: ", JSON.stringify(referenceMessage?.author.id))
            replyTo = {
                //@ts-ignore
                userId: referenceMessage?.author.id || "",
                messageId: message.reference?.messageId
            };
        }
        if (!messageData[userId]) {
            messageData[userId] = {};
        }
        messageData[userId][timestamp] = {message: message.content, messageId: messageId, replyTo};

        lastUserId = userId;
        lastMessageId = timestamp;
    });

    if (lastUserId && lastMessageId) {
        delete messageData[lastUserId][lastMessageId];
        if (Object.keys(messageData[lastUserId]).length === 0) {
            delete messageData[lastUserId];
        }


        }
    console.log(JSON.stringify(messageData));
    return messageData;
}


function getFirstMessageDetails(messageData: Record<string, Record<string, { message: string, messageId: string, replyTo: null | { userId: string, messageId: string } }>>) {
    const timestamps = Object.values(messageData).flatMap(userMessages => Object.keys(userMessages).map(Number));
    const firstTimestamp = Math.min(...timestamps);
    const firstUserId = Object.keys(messageData).find(userId => messageData[userId][firstTimestamp]);

    return { timestampOpen: firstTimestamp, firstUserId: firstUserId || "" };
}

async function getUsernames(messageData: Record<string, Record<string, { message: string, messageId: string, replyTo: null | { userId: string, messageId: string } }>>, interaction: ButtonInteraction) {
    const userIds = new Set(Object.keys(messageData));
    let usernames: string = "";

    for (const userId of userIds) {
        const user = await interaction.guild?.members.fetch(userId);
        if (user) {
            usernames += user.user.username;
        }
    }

    return usernames as string;
}

async function insertMessages(messageData: object, instigator: string, members: string, timestampOpen: number) {
    const timestampClose = Date.now();
    return db.insert(config.table || "chatlogs", instigator, members, messageData, timestampOpen, timestampClose);
}