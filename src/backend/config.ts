import * as dotenv from 'dotenv';
dotenv.config();
export const config = {
    port: process.env.WEBSITE_PORT,
    botToken: process.env.BOT_TOKEN || "",
    discordClientId: process.env.DISCORD_CLIENT_ID || "",
    discordAdmins: process.env.DISCORD_ADMINS || "",
    sqlServerType: process.env.SQL_SERVER_TYPE,
    sqlHost: process.env.MYSQL_HOST,
    sqlPort: Number(process.env.MYSQL_PORT) || 3306,
    sqlUser: process.env.MYSQL_USER || "root",
    sqlPass: process.env.MYSQL_PASSWORD || "",
    sqlDatabase: process.env.MYSQL_DATABASE,
    setup: process.env.SETUP,
    dev: process.env.DEV,
    table: process.env.SQL_TABLE || "ChatLogs",
    storageTable: "storage",
    websiteHost: process.env.WEBSITE_HOST || "localhost",

}