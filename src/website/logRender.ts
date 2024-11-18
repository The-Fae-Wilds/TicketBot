import Express from "express";
import {config} from "../backend/config";
import { Database } from "../libs/database";

const db = Database();

interface Log {
    log: {
        [userId: string]: {
            [timestamp: string]: {
                message: string;
                replyTo?: {
                    userId: string;
                    username: string;
                    messageId: string;
                };
            };
        };
    };
    id: string;
    instigator: string;
    members: string;
    timestamp: number;
}

async function fetchDiscordUser(userId: string) {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
        headers: {
            "Authorization": `Bot ${config.botToken}`
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch user ${userId}`);
    }
    return response.json();
}

export default function createLogRenderRouter(pages:string[]) {

    const router = Express.Router();

    router.get("/*", async (req, res) => {
        const uri = req.url.slice(1);
        if (!uri) {
            return res.render('main', {page: 'loglist/logs', nav: pages});
        }
        const logData = await db.select(config.table || "chatlogs", uri) as Log;
        if (!logData) {
            return res.status(404).send("Not found");
        }
        const log = typeof logData.log === 'string' ? JSON.parse(logData.log) : logData.log;
        const userIds = Object.keys(log);

        const userDetails = await Promise.all(userIds.map(fetchDiscordUser));

        const messages: { user: string; timestamp: number; messageId: string; message: string; replyTo?: { username: string; messageId: string } }[] = [];
        for (const userId of userIds) {
            const user = userDetails.find(u => u.id === userId);
            const userMessages = log[userId];
            for (const [timestamp, messageData] of Object.entries(userMessages)) {
                if (typeof messageData === 'object' && messageData !== null) {
                    messages.push({
                        user: user.global_name,
                        timestamp: parseInt(timestamp, 10),
                        //@ts-ignore
                        messageId: messageData.messageId,
                        //@ts-ignore
                        message: messageData.message,
                        //@ts-ignore
                        replyTo: messageData.replyTo ? {
                            //@ts-ignore
                            userId: userDetails.find(u => u.id === messageData.replyTo.userId),
                            //@ts-ignore
                            messageId: messageData.replyTo.messageId,
                        } : undefined
                    });
                }
            }
        }
        messages.sort((a, b) => a.timestamp - b.timestamp);

        return res.render('../loglist/logrender', { pages, messages, log: logData });
    });
    return router;
}