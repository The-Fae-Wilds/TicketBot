import Express from 'express';
import fs from 'fs';
import path from 'path';
import { sqliteSetup, mysqlSetup } from '../libs/database';

const app = Express();
const setupFilePath = path.join(__dirname, '..', '..', '.env');

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', '..', 'public', 'setup'));

app.get('/', (req, res) => {
    res.render('setup');
});

app.post('/setup', async (req, res) => {
    const config = req.body;

    // Read the existing .env file
    let envContent = await fs.promises.readFile(setupFilePath, 'utf-8');

    // Update the values
    const newValues = {
        WEBSITE_PORT: config.websitePort,
        WEBSITE_HOST: config.websiteHost,
        BOT_TOKEN: config.botToken,
        DISCORD_CLIENT_ID: config.discordClientId,
        DISCORD_ADMINS: JSON.stringify(config.discordAdmins),
        DISCORD_TICKETS: config.discordTickets,
        SQL_SERVER_TYPE: config.sqlServerType,
        MYSQL_HOST: config.mysqlHost,
        MYSQL_PORT: config.mysqlPort,
        MYSQL_USER: config.mysqlUser,
        MYSQL_PASSWORD: config.mysqlPassword,
        MYSQL_DATABASE: config.mysqlDatabase,
        SQL_TABLE: config.sqlTable,
        SETUP: 'True'
    };

    for (const [key, value] of Object.entries(newValues)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    }
    await fs.promises.writeFile(setupFilePath, envContent);
    console.log(envContent);
    if(config.sqlServerType === 'mysql') {
        await mysqlSetup(config.sqlTable);
    } else {
        await sqliteSetup(config.sqlTable);
    }

    const newPort = config.websitePort;

    res.json({ newPort: newPort})

    //res.redirect(`http://localhost:${newPort}/`);

    setupComplete()
});


app.listen(3001, () => {
    console.log('Setup server is running on port 3001');
});

function setupComplete() {
    process.kill(process.pid, 'SIGUSR2');
}