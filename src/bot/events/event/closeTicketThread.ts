import {ButtonInteraction, Message, PermissionFlagsBits, TextChannel} from "discord.js";
import {config} from "../../../backend/config";
import {Database} from "../../../libs/database";

const db = Database();


export default async function closeTicketThread(interaction:ButtonInteraction) {
    const thread = interaction.client.channels.cache.get(interaction.channelId);


    if (thread) {
        const botMember = await interaction.guild?.members.fetch(interaction.client.user?.id || '');

        const webhookidRow = await db.select("storage","webhookid")

        if ( botMember?.permissions.has(PermissionFlagsBits.ManageThreads)) {

            const messages = await fetchMessages(thread.id, interaction, botMember.id, webhookidRow.data);

            const { timestampOpen, firstUserId } = getFirstMessageDetails(messages, botMember.id || "", webhookidRow.data);
            const firstUser = await interaction.guild?.members.fetch(firstUserId);
            const firstUsername = firstUser?.user.username;

            const usernames = await getUsernames(messages, interaction, botMember.id || "", webhookidRow.data);

            const uri = await insertMessages(messages, firstUsername || "Unknown", usernames, timestampOpen);
            if (firstUser) {
                firstUser?.user.send(`Your ticket has been closed. You can view the chatlog here: https://${config.websiteHost}/chatlog/${uri}`)
            }

            await interaction.reply({ content: "Ticket thread has been closed.", ephemeral: true });



            return thread.delete("Ticket closed by user request")
                .catch(console.error);

        } else {
            return interaction.reply({ content: "Error: Bot lacks the necessary permissions to delete the thread. \nPlease report this to an Admin", ephemeral: true });
        }
    }
}

async function fetchMessages(channelId: string, interaction: ButtonInteraction, botUserId: string, webhookId: string) {
    const thread = await interaction.client.channels.cache.get(channelId) as TextChannel;
    const messages = await thread?.messages.fetch();
    //@ts-ignore
    const messageData : Record<string, Record<string, { message: string, messageId: string, replyTo: null | { userId: string, messageId: string } }>> = {};

    let lastUserId: string | null = null;
    let lastMessageId: number | null = null;

    messages?.forEach((message: Message) => {

        if(message.author.id === botUserId || message.author.id === webhookId) {
            console.log(message.author.id);
            return;
        }

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
    /*
    if (lastUserId && lastMessageId) {
        delete messageData[lastUserId][lastMessageId];
        if (Object.keys(messageData[lastUserId]).length === 0) {
            delete messageData[lastUserId];
        }
    }

     */
    console.log(JSON.stringify(messageData));
    return messageData;
}

function getFirstMessageDetails(messageData: Record<string, Record<string, { message: string, messageId: string, replyTo: null | { userId: string, messageId: string } }>>, botUserId: string, webhookId: string) {
    const firstMessageDataFiltered = Object.fromEntries(
        Object.entries(messageData).filter(([userId]) =>  userId !== webhookId && userId !== botUserId)
    );
    const timestamps = Object.values(firstMessageDataFiltered).flatMap(userMessages => Object.keys(userMessages).map(Number));
    const firstTimestamp = Math.min(...timestamps);
    const firstUserId = Object.keys(firstMessageDataFiltered).find(userId => firstMessageDataFiltered[userId][firstTimestamp]);

    return { timestampOpen: firstTimestamp, firstUserId: firstUserId || "" };
}

async function getUsernames(messageData: Record<string, Record<string, { message: string, messageId: string, replyTo: null | { userId: string, messageId: string } }>>, interaction: ButtonInteraction, botUserId: string, webhookId: string) {
    const firstMessageDataFiltered = Object.fromEntries(
        Object.entries(messageData).filter(([userId]) =>  userId !== webhookId && userId !== botUserId)
    );
    const userIds = new Set(Object.keys(firstMessageDataFiltered));
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