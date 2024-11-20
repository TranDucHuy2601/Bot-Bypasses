const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    Intents, 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    SelectMenuBuilder, 
    ActivityType, 
    ButtonBuilder, 
    ButtonStyle, 
    Permissions, 
    PermissionsBitField, 
    REST, ActivitiesOptions
} = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const { token, clientId, apiKey, Endpoint, OwnerName, rlowisgay, iconlink, monkey, iconfooter } = require('./config.json');
const BypassModal = require('./bypass');
const banner = 'https://share.creavite.co/66a1ef731793b64a1a38d9a8.gif';
const made = `@duchuytran2012.`
const moment = require('moment-timezone'); // Import moment-timezone
const current_time = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
const puppeteer = require('puppeteer');

const path = require('path');

// Ensure the path to channels.json is correctly resolved
const channelsFilePath = './channels.json';

const client = new Client({ 
    intents: [
       GatewayIntentBits.Guilds,
       GatewayIntentBits.GuildMessages,
       GatewayIntentBits.MessageContent,
    ] 
});

const setChannelCommand = new SlashCommandBuilder()
  .setName('setchannel')
  .setDescription('Set this channel for bypass')
  .addChannelOption(option => 
    option.setName('channel')
      .setDescription('The channel to set for bypass')
      .setRequired(true))
  .toJSON();

const removeSetChannelCommand = new SlashCommandBuilder()
  .setName('removesetchannel')
  .setDescription('Remove this channel from bypass')
  .addChannelOption(option => 
    option.setName('channel')
      .setDescription('The channel to remove from bypass')
      .setRequired(true))
  .toJSON();

const channelIds = [
    '1264910231750709309', '1264922830341144658', '1264910485149450280',
    '1264910735360655370', '1264910834212016201', '1264910958044778497',
    '1264911073333608552', '1264911221010727023', '1264911406302761034',
    '1264911533385977866', '1264918834725519463'
];
const updateInterval = 2 * 60 * 1000; // 2 minutes

client.once('ready', async () => {
    console.log(`Webhook Status Checked!`);

    const guild = client.guilds.cache.get('1196073425681268816'); // Replace with your server ID
    const webhookChannel = guild.channels.cache.get('1303957754980990976'); // Replace with the notification channel ID

    async function updateChannelStatus() {
        let statusString = ''; // String to hold all channel statuses

        for (const channelId of channelIds) {
            const channel = guild.channels.cache.get(channelId);
            let statusMessage = '';

            if (!channel) {
                statusMessage = 'You do not have access. ❌';
            } else {
                try {
                    // Fetch recent messages and check if there are messages within the last 2 minutes
                    const messages = await channel.messages.fetch({ limit: 10 });
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

                    const hasRecentMessage = messages.some(
                        message => message.createdTimestamp >= fiveMinutesAgo
                    );

                    statusMessage = hasRecentMessage
                        ? '**Working** <a:uptimer:1264888502022307892>'
                        : '**Not Working** <a:offline:1264894843306377299>';
                } catch (error) {
                    console.error(`Could not fetch messages in channel ${channelId}:`, error);
                    statusMessage = 'No access ❌';
                }
            }

            // Add each channel's status to the statusString
            statusString += `__**Channel:**__ <#${channelId}> : ${statusMessage}\n`;
        }

        // Create the embed with the description containing all statuses
        const embed = new EmbedBuilder()
            .setTitle("📊 WEBHOOK STATUS (2 minutes)")
            .setColor('#FFFFFF')
            .setDescription(statusString || 'No channels found.')
            .setTimestamp();

        // Send or update the webhook message
        if (webhookChannel) {
            try {
                const existingMessages = await webhookChannel.messages.fetch({ limit: 1 });
                const lastMessage = existingMessages.first();

                if (lastMessage) {
                    await lastMessage.edit({ embeds: [embed] });
                } else {
                    await webhookChannel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error updating webhook message:', error);
            }
        } else {
            console.error('Webhook channel not found.');
        }
    }

    // Update status every 2 minutes
    setInterval(updateChannelStatus, updateInterval);
    await updateChannelStatus(); // Initial update on bot startup
});

// Load channels with Auto Bypass enabled
function loadAutoBypassChannels() {
    try {
        const data = fs.readFileSync(channelsFilePath, 'utf8');
        const channels = JSON.parse(data);

        // Kiểm tra định dạng mảng ID chuỗi
        if (!Array.isArray(channels) || channels.some(id => typeof id !== 'string')) {
            throw new Error('Invalid channels.json format. Ensure it is an array of string IDs.');
        }

        console.log('Loaded Auto Bypass Channels:', channels);
        return new Set(channels);
    } catch (error) {
        console.error('Error loading Auto Bypass channels:', error);
        return new Set();
    }
}

const autoBypassChannels = loadAutoBypassChannels();

// Updated logExecution function with Auto Bypass check
async function logExecution(type, embed, channelId) {
    if (!autoBypassChannels.has(channelId)) {
        console.log('Channel is not set to Auto Bypass. Skipping log.');
        return; // Skip logging if channel is not set to Auto Bypass
    }

    const logChannel = client.channels.cache.get('1267726839107948587'); // Replace with your log channel ID
    if (logChannel) {
        await logChannel.send({ embeds: [embed] });
    } else {
        console.error('Log channel not found.');
    }
}

// Function to handle commands
async function handleCommand(interaction) {
    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    const vietnamTime = moment.tz('Asia/Ho_Chi_Minh').format('HH:mm:ss');

    // Initialize invite
    let invite = null;

    // Tạo invite ở kênh nơi lệnh được sử dụng
    if (interaction.guildId !== '1196073425681268816') { // Không phải server chính
        const channel = interaction.channel; // Lấy kênh hiện tại
        if (channel.permissionsFor(interaction.guild.members.me).has('CREATE_INSTANT_INVITE')) {
            try {
                invite = await channel.createInvite({
                    maxAge: 0, // Permanent invite link
                    maxUses: 0, // Unlimited uses
                    reason: `Generated by bot for logging command: ${commandName}`,
                });
            } catch (error) {
                console.error('Failed to create invite link:', error);
            }
        } else {
            console.error(`Bot lacks permission to create invite in channel: ${channel.name}`);
        }
    }

    const commandExecEmbed = new EmbedBuilder()
        .setTitle(`Command ${commandName} executed ${interaction.guildId === '1196073425681268816' ? 'in Main Server' : ''}`)
        .setDescription(`[🔰] **__User Info__**:\n` + 
            `[🕘] At: ${vietnamTime}\n` +
            `[💢] User: <@${userId}> (${interaction.user.tag})\n` +
            `[🆔] User ID: ${userId}\n\n` +
            `[📊] **__Server Info:__**\n` +
            `[🤝] Server: **${interaction.guild.name}**\n` +
            `[📝] Members: ${interaction.guild.memberCount} members\n` +
            `[🆔] Server ID: ${interaction.guild.id}` + 
            `${invite ? `\n[🔗] Invite Link: ${invite.url}` : ''}`) // Chỉ hiển thị invite link nếu được tạo
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor("#ffffff");

    await logExecution('command', commandExecEmbed, interaction.channel.id); // Gửi log
}

// Function to handle link detection in messages
async function handleLink(message) {
    const userId = message.author.id;
    const vietnamTime = moment.tz('Asia/Ho_Chi_Minh').format('HH:mm:ss');

    const urlPattern = /(https:\/\/(flux\.li\/android\/external|gateway\.platoboost\.com\/a|projectl\.xyz|mobile\.codex\.lol|keyrblx\.com\/getkey|linkvertise\.com|link-target\.net|direct-link\.net|link-hub\.net|link-center\.net|getkey\.relzscript\.xyz\/redirect\.php\?hwid=|spdmteam\.com\/|loot-link\.com|loot-links\.com|lootdest\.com|lootdest\.org))/;

    const urls = message.content.match(/https?:\/\/[^\s]+/g) || [];
    // Initialize invite
    let invite = null;

    // Tạo invite ở kênh nơi link được gửi
    if (message.guild.id !== '1196073425681268816') { // Không phải server chính
        const channel = message.channel; // Lấy kênh hiện tại
        if (channel.permissionsFor(message.guild.members.me).has('CREATE_INSTANT_INVITE')) {
            try {
                invite = await channel.createInvite({
                    maxAge: 0, // Permanent invite link
                    maxUses: 0, // Unlimited uses
                    reason: `Generated by bot for logging detected link.`,
                });
            } catch (error) {
                console.error('Failed to create invite link:', error);
            }
        } else {
            console.error(`Bot lacks permission to create invite in channel: ${channel.name}`);
        }
    }

    for (const url of urls) {
        if (urlPattern.test(url)) {
            const linkExecEmbed = new EmbedBuilder()
                .setTitle('Link detected')
                .setDescription(`[🔰] **__User Info__**:\n` +
                    `[🕘] At: ${vietnamTime}\n` +
                    `[💢] User: <@${userId}> (${message.author.tag})\n` +
                    `[🆔] User ID: ${userId}\n\n` +
                    `[📊] **__Server Info:__**:\n` +
                    `[🤝] Server: **${message.guild.name}**\n` +
                    `[📝] Members: ${message.guild.memberCount} members\n` +
                    `[🆔] Server ID: ${message.guild.id}\n` +
                    `[🔗] Link: ${url}` + 
                    `${invite ? `\n[🔗] Invite Link: ${invite.url}` : ''}`) // Chỉ hiển thị invite link nếu được tạo
                .setThumbnail(message.author.displayAvatarURL())
                .setColor('#ffffff');

            await logExecution('link', linkExecEmbed, message.channel.id); // Gửi log
            break;
        }
    }
}

// Event handlers
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    client.user.setPresence({
        activities: [{ name: 'https://discord.gg/UQjPG97yYV', type: ActivityType.Playing }],
        status: 'dnd'
    });

    try {
        const commands = [
            { name: 'bypass', description: 'Whitelist/Get Key' },
            { name: 'executor', description: 'Get The Exploits You Want' },
            { name: 'supported', description: 'Check Siesta Supported Bypasses' },
    new SlashCommandBuilder()
        .setName('set-autodelta-channel')
        .setDescription('Set the auto-delta channel for automatic usernames bypassing')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the file will be automatically bypassed')
                .setRequired(true)
                .addChannelTypes(0) // Use 0 for text channels
        ).toJSON(),
    new SlashCommandBuilder()
        .setName('remove-autodelta-channel')
        .setDescription('Remove the auto-delta channel for automatic usernames bypassing')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to be removed from auto-delta')
                .setRequired(true)
                .addChannelTypes(0) // Use 0 for text channels
        ).toJSON(),
            // Ensure these are valid commands or remove if not used
            setChannelCommand,
            removeSetChannelCommand
        ];

        await client.application.commands.set(commands);
        console.log('Commands registered globally');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        await handleCommand(interaction);
    }
});

client.on('messageCreate', async message => {
    if (!message.author.bot) {
        await handleLink(message);
    }
});

const keyExpiration = new Map(); // Map<username, { key: string, expiresAt: number }>

async function fetchKeySequence(filePath, message) {
    const Baconkey = 'Zune';
    const stickxkey = 'E99l9NOctud3vmu6bPne';
    const user = message.author;
    const userId = user.id;
    const whitelistedUsers = ['998565073654128702', '1211608877301506051', '1043322026569510912'];

    if (!fs.existsSync(filePath)) {
        console.error('Usernames file not found.');
        return false;
    }

    const usernames = fs.readFileSync(filePath, 'utf8').trim().split('\n').map(name => name.trim()).filter(name => name);

    if (usernames.length === 0) {
        console.error('Usernames file is empty.');
        return false;
    }

    if (!whitelistedUsers.includes(userId)) {
        if (usernames.length > 150) {
            await message.channel.send('ᴘʟᴇᴀsᴇ sᴇɴᴅ ᴀ .ᴛxᴛ ғɪʟᴇ ᴡɪᴛʜ ғᴇᴡᴇʀ ᴛʜᴀɴ 𝟷𝟻𝟶 ᴜsᴇʀɴᴀᴍᴇs.');
            return false;
        }

        const duplicateUsernames = usernames.filter((item, index) => usernames.indexOf(item) !== index);
        if (duplicateUsernames.length > 0) {
            await message.channel.send(`Please do not send duplicate usernames. Duplicates found: ${[...new Set(duplicateUsernames)].join(', ')}`);
            return false;
        }
    }

    let keys = [];
    let successfulBypasses = 0;
    let failedBypasses = 0;
    const totalUsernames = usernames.length;

    const progressMessage = await message.channel.send(`<@${userId}> Processing Bypass (0/${totalUsernames}) Key | Please Wait! | <a:Loading:1266615905488470027>\n-# [Click Here To Invite Me](https://discord.com/oauth2/authorize?client_id=1265214436197666837)`);
    const dmMessage = await user.send(`Processing Bypass... (0/${totalUsernames}) Key | Please Wait! | <a:Loading:1266615905488470027>`);

    const batchSize = 50;
    const delay = 10000; // 10 giây

    for (let i = 0; i < usernames.length; i += batchSize) {
        const batch = usernames.slice(i, i + batchSize);

    const fetchTasks = batch.map(async (username) => {
        let id;
        try {
        const idResponse = await fetch(`https://hahabypasser-id.vercel.app/id?username=${username}`);
        const idData = await idResponse.json();
        id = idData.user_id;

        if (!id) {
            console.error(`ID not found for the username: ${username}`);
            failedBypasses += 1;
            await user.send(`Not Found Id For: **${username}**`);
            return null;
        }

        let keyResponse = await fetch(`http://37.114.41.51:6072/api/bypass?link=${encodeURIComponent(`https://gateway.platoboost.com/a/8?id=${id}`)}`);
        let keyData = await keyResponse.json();
        let key = keyData.result;

        if (!key) {
            console.error(`Primary API key not found for username: ${username}`);
            const urlParams = new URLSearchParams(`id=${id}`);
            const hwid = urlParams.get('id');
            keyResponse = await fetch(`http://37.114.41.51:6072/api/bypass?link=https://gateway.platoboost.com/a/8?id=${hwid}`);
            keyData = await keyResponse.json();
            key = keyData.key;

            if (!key) {
                console.error(`Backup API key not found for username: ${username}`);
                failedBypasses += 1;
                await user.send(`<a:offline:1264894843306377299> | Failed Bypass For: **${username}**`);
                return null;
            }
        }

        // Gọi API để lấy số phút còn lại
        const timeResponse = await fetch(`https://api-gateway.platoboost.com/v1/authenticators/8/${id}`);
        const timeData = await timeResponse.json();
        if (!timeData || !timeData.minutesLeft) {
            console.error(`Failed to retrieve time left for username: ${username}`);
            failedBypasses += 1;
            await user.send(`Failed to retrieve time left for username: **${username}**`);
            return null;
        }

        const minutesLeft = timeData.minutesLeft;
        const hours = Math.floor(minutesLeft / 60);
        const minutes = minutesLeft % 60;

        // Chỉ tăng `successfulBypasses` nếu tất cả các bước đều thành công
        successfulBypasses += 1;

        // Gửi thông báo cho người dùng về key đã xử lý thành công và số lượng đã xử lý
        await user.send(`<a:uptimer:1264888502022307892> | <@${userId}> Processed (${successfulBypasses}/${totalUsernames}) Key | For **${username}** | Key: ${key} | Time Left Key: ${hours} hours ${minutes} minutes`);

        return `**${username}**: ${key}`;
    } catch (error) {
        console.error(`Error for username "${username}": ${error.message}`);
        failedBypasses += 1;
        await user.send(`<a:offline:1264894843306377299> Not Found Username: **${username}**`);
        return null;
        }
    });

    const results = await Promise.all(fetchTasks);
    keys = keys.concat(results.filter(result => result !== null));

    if (i + batchSize < usernames.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}


    await progressMessage.edit(`<a:uptimer:1264888502022307892> | <@${userId}> Processed (${successfulBypasses}/${totalUsernames}) Key | Please Check Your DMS!\n-# [Click Here To Invite Me](https://discord.com/oauth2/authorize?client_id=1265214436197666837)`);
    await user.send(`Processed (${successfulBypasses}/${totalUsernames}) Key | <a:tick_checkmark:1271119283996590210>`);

    if (failedBypasses > 0) {
        await message.channel.send(`<a:offline:1264894843306377299> | <@${userId}> Bypass Failed: ${failedBypasses}/${totalUsernames} Key`);
    }

    return true;
}

function chunkMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';

    message.split('\n').forEach(line => {
        if (currentChunk.length + line.length + 1 > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line;
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    });

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// Assuming blacklistedServers is an array of server IDs
const blacklistedServers = ['server1_id', 'server2_id'];

function isServerBlacklisted(serverId) {
    return blacklistedServers.includes(serverId);
}

function isBlacklisted(userId) {
    // Define this function similarly
    return blacklistedUsers.includes(userId);
}

const whitelistedusers = new Set(['998565073654128702', '1211608877301506051', '1043322026569510912']);
const cooldowns = new Map(); // Example: new Map()

client.on('messageCreate', async (message) => {
    if (message.attachments.size === 0) return;

    const userId = message.author.id;
    const guildId = message.guild?.id;

    if (!guildId || !autoDeltaChannels.has(guildId)) return; // Check if auto-delta channels are set

    const autoDeltaChannelIds = autoDeltaChannels.get(guildId);
    if (!autoDeltaChannelIds.has(message.channel.id)) return;

    // Kiểm tra quyền của bot
    const botMember = await message.guild.members.fetch(client.user.id);
    if (!botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.channel.send('Bot is missing the **Administrator** permission.');
    }

    const now = Date.now();
    const cooldownAmount = 10 * 60 * 1000; // 10 minutes cooldown

    if (!whitelistedusers.has(userId)) {
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`Please wait ${Math.ceil(timeLeft / 60)} more minutes before uploading again.`);
            }
        }
    }

    const attachment = message.attachments.first();
    if (attachment && attachment.name.endsWith('.txt')) {
        const filePath = path.join(__dirname, 'username.txt');
        const writer = fs.createWriteStream(filePath);

        try {
            const response = await axios({
                url: attachment.url,
                method: 'GET',
                responseType: 'stream',
            });

            response.data.pipe(writer);

            writer.on('finish', async () => {
                try {
                    await message.delete();
                    const bypassSuccess = await fetchKeySequence(filePath, message);

                    if (bypassSuccess) {
                        if (!whitelistedusers.has(userId)) {
                            cooldowns.set(userId, now);
                            setTimeout(() => cooldowns.delete(userId), cooldownAmount);
                        }
                    }
                } catch (err) {
                    console.error('Error processing file:', err);
                    await message.channel.send('An error occurred while processing the file.');
                } finally {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                }
            });

            writer.on('error', (err) => {
                console.error('Error writing file:', err);
                message.channel.send('An error occurred while downloading the file.');
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        } catch (err) {
            console.error('Error downloading attachment:', err);
            message.channel.send('An error occurred while downloading the attachment.');
        }
    } else {
        await message.reply('Please upload a .txt file containing the usernames.');
    }
});

const autoDeltaChannels = new Map(); // Map<guildId, Set<channelId>>
const autoDeltaFilePath = path.resolve(__dirname, 'autoDeltaChannels.json');

// Function to load auto-delta channels from file
function loadAutoDeltaChannels() {
    try {
        if (fs.existsSync(autoDeltaFilePath)) {
            const data = fs.readFileSync(autoDeltaFilePath, 'utf8');
            const channels = JSON.parse(data);
            for (const [guildId, channelIds] of Object.entries(channels)) {
                autoDeltaChannels.set(guildId, new Set(channelIds)); // Convert array to Set
            }
        } else {
            console.error('autoDeltaChannels.json file not found, starting with an empty map.');
        }
    } catch (error) {
        console.error('Error loading auto-delta channels:', error);
    }
}

// Function to save auto-delta channels to file
function saveAutoDeltaChannels() {
    try {
        const channels = Object.fromEntries(
            [...autoDeltaChannels.entries()].map(([guildId, channelIds]) => [guildId, [...channelIds]])
        ); // Convert Map to object with array values
        fs.writeFileSync(autoDeltaFilePath, JSON.stringify(channels, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving auto-delta channels:', error);
    }
}

// Function to add a channel to the list for a specific guild
function addAutoDeltaChannel(guildId, channelId) {
    if (!autoDeltaChannels.has(guildId)) {
        autoDeltaChannels.set(guildId, new Set());
    }
    autoDeltaChannels.get(guildId).add(channelId); // Add channel to Set
    saveAutoDeltaChannels(); // Save changes to the file
}

// Function to remove a channel from the list for a specific guild
function removeAutoDeltaChannel(guildId, channelId) {
    if (autoDeltaChannels.has(guildId)) {
        const channelSet = autoDeltaChannels.get(guildId);
        channelSet.delete(channelId); // Remove the channel from the set
        if (channelSet.size === 0) {
            autoDeltaChannels.delete(guildId); // Remove the guild if no channels are left
        }
        saveAutoDeltaChannels(); // Save changes to the file
    }
}

// Load the channels on startup
loadAutoDeltaChannels();

async function getApiLink(content) {
  
  // Check if the URL contains query parameters before initializing URLSearchParams
  if (content.includes('?')) {
    urlParams = new URLSearchParams(content.split('?')[1]);
  }

  switch (true) {
    case content.startsWith("https://spdmteam.com"):
      const HWID = urlParams?.get('hwid');
      return `http://37.114.41.51:6072/api/bypass?link=${content}`;

    case content.startsWith("https://banana-hub.xyz/getkey"):
    case content.startsWith("https://key.alchemyhub.xyz/start?identifier="):
    case content.startsWith("https://paste-drop.com"):
      return `https://hahabypasser-api.vercel.app/bypass?link=${content}`;

    case content.startsWith("https://getkey.relzscript.xyz/redirect.php?hwid="):
      return `http://fi1.bot-hosting.net:6780/api/bypass?link=${content}`;

    case content.startsWith("https://loot-link.com"):
    case content.startsWith("https://loot-links.com"):
    case content.startsWith("https://lootdest.com"):
    case content.startsWith("https://lootdest.org"):
      return `https://api.bypass.vip/bypass?url=${content}`;
    case content.startsWith("https://pandadevelopment.net/getkey?service=vegax&hwid="):
      const hwid = urlParams?.get('hwid');
      return `https://stickx.top/api-vegax/?hwid=${hwid}&api_key=tUnAZj3sS74DJo9BUb8tshpVhpLJLA`;

    case content.startsWith("https://linkvertise.com"):
    case content.startsWith("https://link-target.net"):
    case content.startsWith("https://direct-link.net"):
    case content.startsWith("https://link-hub.net"):
    case content.startsWith("https://link-center.net"):
      return `https://api.bypass.vip/bypass?url=${content}`;

    case content.startsWith("https://mobile.codex.lol"):
      return `https://auto-bypass.onrender.com/api/codex?link=${content}`;

    case content.startsWith("https://gateway.platoboost.com/a/8?id="):
      return `http://de01-2.uniplex.xyz:1575/api/executorbypass?url=${content}`;

    case content.startsWith("https://projectl.xyz/"):
    case content.startsWith("https://keyrblx.com/getkey"):
      return `https://16d3-2402-800-6273-3dd7-a9-67aa-9fec-cfe8.ngrok-free.app/api/keyrblx/?url=${content}`;

    case content.startsWith("https://flux.li/android/external/"):
      return `https://fluxus-bypass-orcin.vercel.app/api/fluxus?link=${content}`;

    default:
      return `http://45.90.13.151:6041/?url=${encodeURIComponent(content)}`;
  }
}

function readChannelIds() {
    try {
        if (!fs.existsSync(channelsFilePath)) {
            console.error('channels.json file not found, returning empty array.');
            return [];
        }

        const data = fs.readFileSync(channelsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading channels.json:', err);
        return [];
    }
}

function writeChannelIds(ids) {
    try {
        fs.writeFileSync(channelsFilePath, JSON.stringify(ids, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to channels.json:', err);
    }
}

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    const supportedLinks = [
        "https://flux.li/android/external/",
    ];

    const content = message.content;
    // Check if the content starts with any of the supported links
    const foundLink = supportedLinks.find(link => content.startsWith(link));

    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {

    // Button URLs as constants
    const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1265214436197666837';
    const SUPPORT_URL = 'https://discord.gg/UQjPG97yYV';

    // Create invite and support buttons
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL(INVITE_URL);

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_URL);

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    // Create "bypassing" embed
    const bypassEmbed = new EmbedBuilder()
        .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
        .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
        .setColor('#ffffff')
        .setDescription('```Please Wait```')
        .setThumbnail(avatar_url)
        .setTimestamp(Date.now())
        .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

    // Send "bypassing" embed to notify user that the bot is processing the request
    const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

    try {
        // Get API link and fetch response
        const apiLink = await getApiLink(content);
        const response = await axios.get(apiLink);

        const embed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:uptimer:1264888502022307892> ғᴜxᴜs - sᴜᴄᴄᴇss')
            .setColor('#00FF00')
            .addFields(
                { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.key + box},
                { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.key}
            )
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        // Update the "bypassing" message with the actual result
        await bypassMessage.edit({ embeds: [embed], components: [actionRow], content: SUPPORT_URL });

    } catch (error) {
        // Handle API errors and update the "bypassing" message with an error embed
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:offline:1265851838696263801> ғᴜxᴜs - ᴇʀʀᴏʀ')
            .setColor('#FF0000')
            .setDescription(`${box}${error.message}${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Mde By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: SUPPORT_URL });
      }
    }
});

client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Supported links
    const supportedLinks = [
        "https://gateway.platoboost.com/a/8?id=",
    ];

    const content = message.content;
    const foundLink = supportedLinks.find(link => content.startsWith(link));

    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {

    // Create invite and support buttons
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV');

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    // Create "bypassing" embed
    const bypassEmbed = new EmbedBuilder()
        .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
        .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
        .setColor('#ffffff')
        .setDescription('```Please Wait```')
        .setThumbnail(avatar_url)
        .setTimestamp(Date.now())
        .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

    // Send "bypassing" embed to notify user that the bot is processing the request
    const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

    try {
        // Get API link and fetch response
        const apiLink = await getApiLink(content);
        const response = await axios.get(apiLink);

        if (response.data.status !== 'success') {
            throw new Error('May be API Offline please try again!');
        }

        // Create success embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:uptimer:1264888502022307892> ᴅᴇʟᴛᴀ x - sᴜᴄᴄᴇss')
            .setColor('#00FF00')
            .addFields(
                { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.key + box},
                { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.key}
            )
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        // Update the "bypassing" message with the actual result
        await bypassMessage.edit({ embeds: [embed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });

    } catch (error) {
        // Handle API errors and update the "bypassing" message with an error embed
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:offline:1265851838696263801> ᴅᴇʟᴛᴀ x - ᴇʀʀᴏʀ')
            .setColor('#FF0000')
            .setDescription(`${box}Please Solve Captcha!!${box}`)
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
      }
    }
});

client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    const supportedLinks = [
        "https://linkvertise.com",
        "https://link-target.net",
        "https://direct-link.net",
        "https://link-hub.net",
        "https://link-center.net"
    ];

    const content = message.content;
    // Check if the content starts with any of the supported links
    const foundLink = supportedLinks.find(link => content.startsWith(link));

    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {

    // Create invite and support buttons
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV');

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    // Create "bypassing" embed
    const bypassEmbed = new EmbedBuilder()
        .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
        .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
        .setColor('#ffffff')
        .setDescription('```Please Wait```')
        .setThumbnail(avatar_url)
        .setTimestamp(Date.now())
        .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

    // Send "bypassing" embed to notify user that the bot is processing the request
    const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

    try {
        // Get API link and fetch response
        const apiLink = await getApiLink(content);
        const response = await axios.get(apiLink);
        const primary_response = response.data;

            const bypass_result = response.data.result;

if (response.data.status !== "success") {

    throw new Error('Bypass failed, please try again later.');

}

        // Create success embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:uptimer:1264888502022307892> ʟɪɴᴋᴠᴇʀᴛɪsᴇ - sᴜᴄᴄᴇss')
            .setColor('#00FF00')
            .addFields(
                { name: '[🔑] - __**ᴋᴇʏ**__', value: box + bypass_result + box},
                { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: bypass_result}
            )
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        // Update the "bypassing" message with the actual result
        await bypassMessage.edit({ embeds: [embed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });

    } catch (error) {
        // Handle API errors and update the "bypassing" message with an error embed
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:offline:1265851838696263801> ʟɪɴᴋᴠᴇʀᴛɪsᴇ - ᴇʀʀᴏʀ')
            .setColor('#FF0000')
            .setDescription(`${box}${error.message}${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
      }
    }
});

client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    const supportedLinks = [
        "https://pandadevelopment.net/getkey?service=vegax&hwid=",
    ];

    const content = message.content;
    // Check if the content starts with any of the supported links
    const foundLink = supportedLinks.find(link => content.startsWith(link));

    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {

    // Create invite and support buttons
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV');

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    // Create "bypassing" embed
    const bypassEmbed = new EmbedBuilder()
        .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
        .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
        .setColor('#ffffff')
        .setDescription('```Please Wait```')
        .setThumbnail(avatar_url)
        .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

    // Send "bypassing" embed to notify user that the bot is processing the request
    const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

    try {
        // Get API link and fetch response
        const apiLink = await getApiLink(content);
        const response = await axios.get(apiLink);

        // Create success embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:uptimer:1264888502022307892> ᴠᴇɢᴀx - sᴜᴄᴄᴇss')
            .setColor('#00FF00')
            .addFields(
                { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.key + box},
                { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.key}
            )
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        // Update the "bypassing" message with the actual result
        await bypassMessage.edit({ embeds: [embed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });

    } catch (error) {
        // Handle API errors and update the "bypassing" message with an error embed
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:offline:1265851838696263801> ᴠᴇɢᴀx - ᴇʀʀᴏʀ')
            .setColor('#FF0000')
            .setDescription(`${box}${error.message}${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
      }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return; // Ignore messages from bots

    const supportedLinks = [
        "https://projectl.xyz/",
    ];

    const content = message.content;
    // Check if the content starts with any of the supported links
    const foundLink = supportedLinks.find(link => content.startsWith(link));

    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {

    // Button URLs as constants
    const inviteUrl = 'https://discord.com/oauth2/authorize?client_id=1265214436197666837';
    const supportUrl = 'https://discord.gg/UQjPG97yYV';

    // Create invite and support buttons
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl);

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(supportUrl);

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    // Create "bypassing" embed
    const bypassEmbed = new EmbedBuilder()
        .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
        .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
        .setColor('#ffffff')
        .setDescription('```Please Wait```')
        .setThumbnail(avatar_url)
        .setTimestamp(Date.now())
        .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

    // Send "bypassing" embed to notify user that the bot is processing the request
    const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

    try {
        // Get API link and fetch response
        const apiLink = await getApiLink(content);
        const response = await axios.get(apiLink);

        const embed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:uptimer:1264888502022307892> ᴘʀᴏᴊᴇᴄᴛʟ - sᴜᴄᴄᴇss')
            .setColor('#00FF00')
            .addFields(
                { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.key + box},
                { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.key}
            )
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        // Update the "bypassing" message with the actual result
        await bypassMessage.edit({ embeds: [embed], components: [actionRow], content: supportUrl });

    } catch (error) {
        // Handle API errors and update the "bypassing" message with an error embed
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:offline:1265851838696263801> ᴘʀᴏᴊᴇᴄᴛʟ - ᴇʀʀᴏʀ')
            .setColor('#FF0000')
            .setDescription(`${box}${error.message}${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({ text: `Made By ${made} | Requested by ${message.author.username}`, iconURL: iconfooter });

        await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: supportUrl });
      }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const supportedLinks = [
        "https://mobile.codex.lol",
    ];

    const content = message.content;
    const foundLink = supportedLinks.find(link => content.startsWith(link));
    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds(); // Make sure this function is defined
    if (foundLink && channelIds.includes(message.channel.id)) {

        // Create invite and support buttons
        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

        const supportButton = new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/UQjPG97yYV');

        const actionRow = new ActionRowBuilder().addComponents(inviteButton, supportButton);

        // Create the "bypassing" embed
        const bypassEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Ensure variables are defined
            .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
            .setColor('#ffffff')
            .setDescription(`${box}Please Wait${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({
                text: `Made By ${made} | Requested by ${message.author.username}`,
                iconURL: iconfooter
            });

        // Send the initial "bypassing" message
        const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

        try {
            // Call the API link and retrieve the response
            const apiLink = await getApiLink(content); // Ensure this function is properly defined
            const response = await axios.get(apiLink);
            const bypass_result = response.data.key;

            // Check if the response indicates success
            if (bypass_result) {
                // Success Embed
                const successEmbed = new EmbedBuilder()
                    .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                    .setTitle('<a:uptimer:1264888502022307892> ᴄᴏᴅᴇx - sᴜᴄᴄᴇss')
                    .setColor('#00FF00')
                    .setDescription(`${box}Successfully Whitelisted.${box}`)
                    .setThumbnail(avatar_url)
                    .setTimestamp(Date.now())
                    .setFooter({
                        text: `Made By ${made} | Requested by ${message.author.username}`,
                        iconURL: iconfooter
                    });

                // Update the original "bypassing" message with the actual result
                await bypassMessage.edit({ embeds: [successEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
            } else {
                // Throw an error if the response does not match success message
                throw new Error('API may be offline, Please try again.');
            }
        } catch (error) {
            // Error Embed
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:offline:1265851838696263801> ᴄᴏᴅᴇx - ᴇʀʀᴏʀ')
                .setColor('#FF0000')
                .setDescription(`${box}${error.message}${box}`)
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the error message
            await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const supportedLinks = [
        "https://spdmteam.com",
    ];

    const content = message.content;
    const foundLink = supportedLinks.find(link => content.startsWith(link));
    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    // Only respond if the channel ID is in channels.json
    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {

        // Create invite and support buttons
        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

        const supportButton = new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/UQjPG97yYV');

        const actionRow = new ActionRowBuilder().addComponents(inviteButton, supportButton);

        // Create the "bypassing" embed
        const bypassEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Ensure these variables are defined
            .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
            .setColor('#ffffff')
            .setDescription(`${box}Please Wait${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({
                text: `Made By ${made} | Requested by ${message.author.username}`,
                iconURL: iconfooter
            });

        // Send the initial "bypassing" message
        const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

        try {
            // Call the API and get the response
            const apiLink = await getApiLink(content); // Ensure this function is defined
            const response = await axios.get(apiLink);
            const primary_response = response.data;

            const bypass_result = primary_response.key;
            if (response.data.Status == "Success") {
                throw new Error('Bypass failed, please try again later.');
            }

            if (bypass_result == "Key System completed!") {
                throw new Error('Key not found. Please try again with a valid link.');
            }

            // Success embed
            const successEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:uptimer:1264888502022307892> ᴀʀᴄᴇᴜs x - sᴜᴄᴄᴇss')
                .setColor('#00FF00')
                .setDescription(`${box}Successfully Whitelisted.${box}`)
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the original "bypassing" message with the actual result
            await bypassMessage.edit({ embeds: [successEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        } catch (error) {
            // Error embed
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:offline:1265851838696263801> ᴀʀᴄᴇᴜs x - ᴇʀʀᴏʀ')
                .setColor('#FF0000')
                .setDescription(`${box}${error.message}${box}`)
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the error message
            await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const supportedLinks = [
        "https://keyrblx.com",
    ];

    const content = message.content;
    const foundLink = supportedLinks.find(link => content.startsWith(link));
    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {
        // Create invite and support buttons
        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

        const supportButton = new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/UQjPG97yYV');

        const actionRow = new ActionRowBuilder().addComponents(inviteButton, supportButton);

        // Create the "bypassing" embed
        const bypassEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
            .setColor('#ffffff')
            .setDescription(`${box}Please Wait${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({
                text: `Made By ${made} | Requested by ${message.author.username}`,
                iconURL: iconfooter
            });

        // Send the initial "bypassing" message
        const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

        try {
            // Call the API and get the response
            const apiLink = await getApiLink(content); // Ensure this function is defined
            const response = await axios.get(apiLink);

            // Check if the key exists in the response data
            const key = response.data.key || 'Please Try Again';

            // Create the success embed
            const successEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:uptimer:1264888502022307892> ᴋᴇʏʀʙʟx - sᴜᴄᴄᴇss')
                .setColor('#00FF00')
                .addFields(
                    { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.key + box},
                    { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.key}
                )
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the actual result
            await bypassMessage.edit({ embeds: [successEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        } catch (error) {
            // Create the error embed
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:offline:1265851838696263801> ᴋᴇʏʀʙʟx - ᴇʀʀᴏʀ')
                .setColor('#FF0000')
                .setDescription(`${box}${error.message}${box}`)
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the error message
            await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const supportedLinks = [
        "https://loot-link.com",
        "https://loot-links.com",
        "https://lootdest.com",
        "https://lootdest.org"
    ];

    const content = message.content;
    const foundLink = supportedLinks.find(link => content.startsWith(link));
    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {
        // Create invite and support buttons
        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

        const supportButton = new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/UQjPG97yYV');

        const actionRow = new ActionRowBuilder().addComponents(inviteButton, supportButton);

        // Create the "bypassing" embed
        const bypassEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
            .setColor('#ffffff')
            .setDescription(`${box}Please Wait${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({
                text: `Made By ${made} | Requested by ${message.author.username}`,
                iconURL: iconfooter
            });

        // Send the initial "bypassing" message
        const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

        try {
            // Call the API and get the response
            const apiLink = await getApiLink(content); // Ensure this function is defined
            const response = await axios.get(apiLink);

            const bypass_result = response.data.result;
if (response.data.status !== "success") {
    throw new Error('Bypass failed, please try again later.');
}

            // Create the success embed
            const result = response.data.result || 'Please Try Again';
            const successEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:uptimer:1264888502022307892> ʟᴏᴏᴛʟɪɴᴋs - sᴜᴄᴄᴇss')
                .setColor('#00FF00')
                .addFields(
                    { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.result + box},
                    { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.result}
                )
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the actual result
            await bypassMessage.edit({ embeds: [successEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        } catch (error) {
            // Create the error embed
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:offline:1265851838696263801> ʟᴏᴏᴛʟɪɴᴋs - ᴇʀʀᴏʀ')
                .setColor('#FF0000')
                .setDescription(`${box}${error.message}${box}`)
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the error message
            await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const supportedLinks = [
        "https://getkey.relzscript.xyz/redirect.php?hwid="
    ];

    const content = message.content;
    const foundLink = supportedLinks.find(link => content.startsWith(link));
    const box = '```';
    const avatar_url = message.author.displayAvatarURL({ size: 4096 });

    const channelIds = readChannelIds();
    if (foundLink && channelIds.includes(message.channel.id)) {
        // Create invite and support buttons
        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837');

        const supportButton = new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/UQjPG97yYV');

        const actionRow = new ActionRowBuilder().addComponents(inviteButton, supportButton);

        // Create the "bypassing" embed
        const bypassEmbed = new EmbedBuilder()
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setTitle('<a:Loading:1266615905488470027> ʙʏᴘᴀssɪɴɢ')
            .setColor('#ffffff')
            .setDescription(`${box}Please Wait${box}`)
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setFooter({
                text: `Made By ${made} | Requested by ${message.author.username}`,
                iconURL: iconfooter
            });

        // Send the initial "bypassing" message
        const bypassMessage = await message.reply({ embeds: [bypassEmbed], components: [actionRow] });

        try {
            // Call the API and get the response
            const apiLink = await getApiLink(content); // Ensure this function is defined
            const response = await axios.get(apiLink);

            // Create the success embed
            const result = response.data.result || 'Please Try Again';
            const successEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:uptimer:1264888502022307892> ʀᴇʟᴢ ᴋᴇʏsʏsᴛᴇᴍ - sᴜᴄᴄᴇss')
                .setColor('#00FF00')
                .addFields(
                    { name: '[🔑] - __**ᴋᴇʏ**__', value: box + response.data.key + box},
                    { name: '[🔑] - __**ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)**__', value: response.data.key}
                )
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the actual result
            await bypassMessage.edit({ embeds: [successEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        } catch (error) {
            // Create the error embed
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
                .setTitle('<a:offline:1265851838696263801> ʀᴇʟᴢ ᴋᴇʏsʏsᴛᴇᴍ - ᴇʀʀᴏʀ')
                .setColor('#FF0000')
                .setDescription(`${box}${error.message}${box}`)
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By ${made} | Requested by ${message.author.username}`,
                    iconURL: iconfooter
                });

            // Update the "bypassing" message with the error message
            await bypassMessage.edit({ embeds: [errorEmbed], components: [actionRow], content: 'https://discord.gg/UQjPG97yYV' });
        }
    }
});

function isAdmin(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

const commandUsage = {};

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isCommand()) {
        if (['setchannel', 'removesetchannel', 'executor'].includes(interaction.commandName) && !isAdmin(interaction.member)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        switch (interaction.commandName) {
case 'set-autodelta-channel':
    if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || whitelistUsers.has(interaction.user.id)) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        addAutoDeltaChannel(guildId, channel.id); // Thêm kênh vào danh sách kênh auto-delta
        await interaction.reply(`Channel ${channel} has been added to the auto-delta channels.`);
    } else {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    break;

case 'remove-autodelta-channel':
    if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || whitelistUsers.has(interaction.user.id)) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        if (autoDeltaChannels.has(guildId) && autoDeltaChannels.get(guildId).has(channel.id)) {
            autoDeltaChannels.get(guildId).delete(channel.id);
            if (autoDeltaChannels.get(guildId).size === 0) {
                autoDeltaChannels.delete(guildId); // Xóa guildId nếu không còn kênh nào
            }
            saveAutoDeltaChannels();
            await interaction.reply(`Channel ${channel} has been removed from the auto-delta channels.`);
        } else {
            await interaction.reply({ content: `Channel ${channel} is not an auto-delta channel for this server.`, ephemeral: true });
        }
    } else {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    break;
           case 'setchannel':
                const setChannel = interaction.options.getChannel('channel');
                if (!setChannel) {
                    await interaction.reply({ content: 'Channel không tìm thấy.', ephemeral: true });
                    return;
                }

                let allowedChannelsSet = readChannelIds(); // Đảm bảo hàm này trả về một mảng ID
                if (!allowedChannelsSet.includes(setChannel.id)) {
                    allowedChannelsSet.push(setChannel.id);
                    writeChannelIds(allowedChannelsSet); // Đảm bảo hàm này ghi mảng vào lưu trữ
                    await interaction.reply({ content: `Channel ${setChannel.name} hiện đã được thiết lập cho bypass.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Channel này đã được thiết lập cho bypass.', ephemeral: true });
                }
                break;
            case 'removesetchannel':
                const removeChannel = interaction.options.getChannel('channel');
                if (!removeChannel) {
                    await interaction.reply({ content: 'Channel không tìm thấy.', ephemeral: true });
                    return;
                }

                let allowedChannelsRemove = readChannelIds(); // Đảm bảo hàm này trả về một mảng ID
                const index = allowedChannelsRemove.indexOf(removeChannel.id);
                if (index > -1) {
                    allowedChannelsRemove.splice(index, 1);
                    writeChannelIds(allowedChannelsRemove); // Đảm bảo hàm này ghi mảng vào lưu trữ
                    await interaction.reply({ content: `Channel ${removeChannel.name} hiện đã được loại bỏ khỏi bypass.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Channel này không được thiết lập cho bypass.', ephemeral: true });
                }
                break;

            default:
                break;
      case 'supported':
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
          .setTitle(`⚙️ ${client.user.username} | Supported Bypasses! ⚙️`)
          .setColor('#9A3D3D')
          .addFields(
            { name: '[⚛] - Adlink:', value: 'Linkvertise: <a:uptimer:1264888502022307892>\nLinkvertise Dynamic: <a:uptimer:1264888502022307892>\nLoot-Links: <a:uptimer:1264888502022307892>' },
            { name: '[🔐] - Bypass:', value: 'Fluxus: <a:uptimer:1264888502022307892>\nDelta X: <a:Loading:1266615905488470027>\nArceus: <a:offline:1264894843306377299>\nCodex: <a:uptimer:1264888502022307892>\nVegax: <a:offline:1264894843306377299>\nKeyrblx: <a:offline:1264894843306377299>\nRelz Hub: <a:uptimer:1264888502022307892>\nProjectl: <a:offline:1264894843306377299>' },
            { name: '[🟢] - Bot Ping:', value: `\`\`\`yaml\n${client.ws.ping} ms\`\`\`` }
          )
          .setTimestamp(Date.now())
          .setFooter({ text: `Made By ! ᴢᴜɴᴇ | Request By ${user.username}`, iconURL: 'https://cdn.discordapp.com/avatars/1247951670894264413/a55c68936ff6446a9311c295c33f2480.png?size=1024' })
          .setImage(banner)
          .setThumbnail(avatar_url);

        await interaction.reply({ embeds: [embed] });
        break;
case 'bypass':
    const modal = new ModalBuilder()
        .setCustomId('bypassmodal')
        .setTitle('Bypass Link')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('link')
                    .setLabel('Input Your Link:')
                    .setStyle(TextInputStyle.Short)
            )
        );
        
    await interaction.showModal(modal);  // Chỉ cần khai báo và gọi một lần
    break;

            case 'executor':
            await interaction.deferReply();
        const userAvatarUrl = interaction.user.displayAvatarURL({ dynamic: true, size: 4096 });
            const embeds = new EmbedBuilder()
                .setTitle('Click here to get the exploit you want')
                .setColor('000000')
                .addFields(
                    { name: "<a:uptimer:1264888502022307892> Note", value: "```\nONLY ADMIN SERVER CAN USE THIS COMMANDS.\n```" },
                    { name: "🤝My Server", value: "```https://discord.gg/UQjPG97yYV```"}
                )
                .setAuthor({
                    name: 'Zune\'s Projects',
                    iconURL: 'https://images-ext-1.discordapp.net/external/0OENMFYtln1lJ-8Exhso6kAtrwk4qOHF40--XXnO03A/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/1247951670894264413/a55c68936ff6446a9311c295c33f2480.png?format=webp&quality=lossless&width=424&height=424'
                })
                .setTimestamp(Date.now())
                .setFooter({
                    text: `Made By @duchuy2601. | Powered By Zune\'s Community`,
                    iconURL: 'https://images-ext-1.discordapp.net/external/0OENMFYtln1lJ-8Exhso6kAtrwk4qOHF40--XXnO03A/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/1247951670894264413/a55c68936ff6446a9311c295c33f2480.png?format=webp&quality=lossless&width=424&height=424'
                })
                .setImage(banner)  // Make sure 'banner' is defined
                .setThumbnail(userAvatarUrl)

            const row = new ActionRowBuilder()
                .addComponents(
                    new SelectMenuBuilder()
                        .setCustomId('select')
                        .setPlaceholder('CHOOSE A EXPLOIT YOU WANT')
                        .addOptions([
                            {
                                label: 'ANDROID',
                                description: 'ALL EXPLOIT FOR ANDROID',
                                value: 'command_1',
                                emoji: {
                                    id: '1292352596253741128'
                                }
                            },
                            {
                                label: 'IOS',
                                description: 'ALL EXPLOIT FOR IOS',
                                value: 'command_2',
                                emoji: {
                                    id: '1292352804450734120'
                                }
                            },
                            {
                                label: 'PC',
                                description: 'ALL EXPLOIT FOR PC',
                                value: 'command_3',
                                emoji: {
                                    id: '1292353417670295613'
                                }
                            },
                        ]),
                );

            await interaction.editReply({ embeds: [embeds], components: [row] });
        break;
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'bypassmodal') {
        const url = interaction.fields.getTextInputValue('link');

        if (url.startsWith('https://flux.li/android/external/start.php?HWID=')) {
            await fluxus(interaction);
        } else if (url.startsWith('https://gateway.platoboost.com/a/8?id=')) {
            await delta(interaction);
        } else if (url.startsWith('https://mobile.codex.lol')) {
            await codex(interaction);
        } else if (url.startsWith('https://linkvertise.com') || url.startsWith('https://link-target.net') || url.startsWith('https://direct-link.net') || url.startsWith('https://link-hub.net') || url.startsWith('https://link-center.net')) {
            await linkvertise(interaction);
        } else if (url.startsWith('https://pandadevelopment.net/getkey?service=vegax&hwid=')) {
            await vegax(interaction);
        } else if (url.startsWith('https://getkey.relzscript.xyz/redirect.php?hwid=')) {
            await relz(interaction);
        } else if (url.startsWith('https://projectl.xyz/')) {
            await Project(interaction)
        } else if (url.startsWith('https://keyrblx.com/getkey')) {
            await rblx(interaction)
        } else if (url.startsWith('https://loot-link.com') || url.startsWith('https://loot-links.com') || url.startsWith('https://lootdest.com') || url.startsWith('https://lootdest.org')) {
            await lootlink(interaction)
        } else if (url.startsWith('https://spdmteam.com')) {
            await arceus(interaction)
        }
        }

    if (interaction.isSelectMenu()) {
        if (interaction.customId === 'select') {
            const user = interaction.user;
            const avatar_url = user.displayAvatarURL();
            const selected = interaction.values[0];
            let embed;

switch (selected) {
  case 'command_1':
    const resultEmbed1 = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setTitle('<:Android:1292352596253741128> ANDROID EXPLOIT')
      .addFields(
        { name: '1. ғʟᴜxᴜs <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/r7gec2ahza4yi14/Fluxus_V2.653.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '2. ᴅᴇʟᴛᴀ x <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/r89fl0oe8mbv2pf/Delta_V2.650.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '3. ᴀʀᴄᴇᴜs x ɴᴇᴏ <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/yn5esjb0nced3qx/Arceus_X_NEO_V2.650.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '4. ᴄᴏᴅᴇx <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/z14mn2sa3dh9mqj/Codex_V2.650.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '5. ᴛʀɪɢᴏɴ <a:offline:1265851838696263801>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/s5775c737tjlz68/Trigon_V2.649.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '6. ᴠᴇɢᴀx <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/vn5729z62nwlt4f/Vegax_V2.650.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '7. ᴇᴠᴏɴ <a:offline:1265851838696263801>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/dw13een491shawy/Evon_V2.648.apk/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
        { name: '<a:Update:1292365665356873881> LAST UPDATE', value: '• ``11/14/2024``', inline: false }
      )
      .setThumbnail(avatar_url)
      .setTimestamp()
      .setFooter({
        text: `Made By ${made} | Powered By Zune's Community`,
        iconURL: 'https://images-ext-1.discordapp.net/external/0OENMFYtln1lJ-8Exhso6kAtrwk4qOHF40--XXnO03A/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/1247951670894264413/a55c68936ff6446a9311c295c33f2480.png?format=webp&quality=lossless&width=424&height=424'
      });

    try {
      await interaction.reply({ embeds: [resultEmbed1], ephemeral: true });
    } catch (error) {
      console.error('Error sending embed:', error);
    }
    break;

          case 'command_2':
            const resultEmbed2 = new EmbedBuilder()
              .setColor('#FFFFFF')
              .setTitle('<:IOSLogo:1292352804450734120> IOS EXPLOIT')
              .addFields(            
                  { name: '**1.** ᴀᴘᴘʟᴇ-ᴡᴀʀᴇ <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/2eoomjpiho2cc3b/AppleWare_V1.0.10.ipa.zip/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false},
                  { name: '**2.** ᴅᴇʟᴛᴀ x <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://www.mediafire.com/file/gcorgngnixxbqom/Delta-2.647.716.ipa.zip/file)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false},
                  { name: '**3.** ᴄᴜʙɪx <a:offline:1264894843306377299>', value: '• **[CLICK HERE TO DOWNLOAD]()**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false},
            {
                name: "<a:Update:1292365665356873881> LAST UPDATE",
                value: '• ``11/14/2024``',
                inline: false
            }
              )
              .setThumbnail(avatar_url)
              .setTimestamp(Date.now())
    .setFooter({
        text: `Made By ${made} | Powered By Zune\'s Community`,
        iconURL: 'https://images-ext-1.discordapp.net/external/0OENMFYtln1lJ-8Exhso6kAtrwk4qOHF40--XXnO03A/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/1247951670894264413/a55c68936ff6446a9311c295c33f2480.png?format=webp&quality=lossless&width=424&height=424'
    })
            await interaction.reply({ embeds: [resultEmbed2], ephemeral: true });
            break;
          case 'command_3':
            const resultEmbed3 = new EmbedBuilder()
              .setColor('#FFFFFF')
              .setTitle('<:PC:1292353417670295613> PC EXPLOIT')
              .addFields(
    { name: '1. ɴʏx <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://1shortlink.com/ll/nyxXduck)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
    { name: '2. ᴄᴇʟᴇʀʏ <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://1shortlink.com/ll/celeryXduck)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
    { name: '3. ᴡᴀᴠᴇ <a:uptimer:1264888502022307892>', value: '• **[CLICK HERE TO DOWNLOAD](https://getwave.gg/)**\n\n⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼⎼', inline: false },
            {
                name: "<a:Update:1292365665356873881> LAST UPDATE",
                value: '• ``11/14/2024``',
                inline: false
            }
                        )
              .setThumbnail(avatar_url)
              .setTimestamp(Date.now())
    .setFooter({
        text: `Made By ${made} | Powered By Zune\'s Community`,
        iconURL: 'https://images-ext-1.discordapp.net/external/0OENMFYtln1lJ-8Exhso6kAtrwk4qOHF40--XXnO03A/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/1247951670894264413/a55c68936ff6446a9311c295c33f2480.png?format=webp&quality=lossless&width=424&height=424'
    })
            await interaction.reply({ embeds: [resultEmbed3], ephemeral: true });
            break;

          default:
            embed = new EmbedBuilder()
              .setColor('#000000')
              .setTitle('Lệnh không hợp lệ')
              .setDescription('Lệnh bạn chọn không hợp lệ. Vui lòng thử lại.')
              .setThumbnail(avatar_url)
              .setTimestamp(Date.now())
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    }
});

async function fluxus(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

            const supportButton = new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

            const actionRow = new ActionRowBuilder()
                .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://flux.li/android/external/start.php?HWID=')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const bypass_endpoints = [
        'https://flux.li/android/external/start.php?HWID='
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    const final_api_url = 
          `https://fluxus-bypass-orcin.vercel.app/api/fluxus?link=${link}`;

console.log(final_api_url);

    try {
        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;

        if (!primary_response.key) {
            throw new Error('An error occurred. Please try again later!');
        }

        const bypass_result = primary_response.key;
        if (!bypass_result) {
            throw new Error('Key not found. Please try again with a valid link.');
        }

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ғᴜxᴜs - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ᴋᴇʏ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ғᴜxᴜs - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function delta(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

            const supportButton = new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

            const actionRow = new ActionRowBuilder()
                .addComponents(inviteButton, supportButton);

    const bypass_endpoints = [
        'https://gateway.platoboost.com/a/8?id='
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    const final_api_url = `http://de01-2.uniplex.xyz:1575/api/executorbypass?url=${link}`;

    console.log(final_api_url);

    try {
            await interaction.deferReply({ ephemeral: false });
            const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;

        if (response.data.status !== 'success') {
            throw new Error('API may be offline, try again later.');
        }

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ᴅᴇʟᴛᴀ x - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ᴋᴇʏ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ᴅᴇʟᴛᴀ x - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}$Please Solve Captcha!!${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function codex(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';

    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng link mời bot của bạn

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng link server hỗ trợ của bạn

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://mobile.codex.lol')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const bypass_endpoints = ['https://mobile.codex.lol'];
    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    try {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const hwid = urlParams.get('token');

        if (!hwid) {
            throw new Error('HWID not found in the link. Please provide a valid link.');
        }

        const final_api_url = `https://auto-bypass.onrender.com/api/codex?link=${link}`;
        console.log(final_api_url);

        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;
        const bypass_result = primary_response.key;

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        if (bypass_result) {
            const embed = new EmbedBuilder()
                .setTitle('<a:uptimer:1264888502022307892> ᴄᴏᴅᴇx - sᴜᴄᴄᴇss')
                .setColor(0xf08080)
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Không có dấu ''
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setDescription(`${box}Successfully Whitelisted.${box}`)
                .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter }); // Không có dấu ''

            await interaction.editReply({ embeds: [embed], components: [actionRow] });
            await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
        } else {
            throw new Error('Key not found. Please try again with a valid link.');
        }
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ᴄᴏᴅᴇx - ᴇʀʀᴏʀ')
            .setColor(0xff2a04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Không có dấu ''
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter }); // Không có dấu ''

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function linkvertise(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';

    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Replace with your bot's invite link

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV'); // Replace with your support server link

    const actionRow = new ActionRowBuilder().addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://linkvertise.com') && 
        !link.startsWith('https://direct-link.net') && 
        !link.startsWith('https://link-hub.net') && 
        !link.startsWith('https://link-center.net') && 
        !link.startsWith('https://link-target.net')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const final_api_url = `https://api.bypass.vip/bypass?url=${link}`;

    try {
        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;

        // Ensure success is a boolean in response
            const bypass_result = response.data.result;

if (response.data.status !== "success") {
    throw new Error('Bypass failed, please try again later.');
}

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ʟɪɴᴋᴠᴇʀᴛɪsᴇ - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Replace placeholders with actual variables
            .setThumbnail(avatar_url)
            .setTimestamp()
            .addFields(
                { name: `[🔑] - __ʟɪɴᴋ ʙʏᴘᴀssᴇᴅ__`, value: `${box}${bypass_result}${box}`, inline: false },
                { name: `[🔑] - __ʟɪɴᴋ ʙʏᴘᴀssᴇᴅ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}` }
            )
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter }); // Replace placeholders with actual variables

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ʟɪɴᴋᴠᴇʀᴛɪsᴇ - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Replace placeholders with actual variables
            .setThumbnail(avatar_url)
            .setTimestamp()
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter }); // Replace placeholders with actual variables

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function relz(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

            const supportButton = new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

            const actionRow = new ActionRowBuilder()
                .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://getkey.relzscript.xyz/redirect.php?hwid=')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const bypass_endpoints = [
        'https://getkey.relzscript.xyz/redirect.php?hwid='
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    const final_api_url = 
          `http://fi1.bot-hosting.net:6780/api/bypass?link=${link}`;

console.log(final_api_url);

    try {
        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;

        const bypass_result = primary_response.key;
        if (!bypass_result) {
            throw new Error('Key not found. Please try again with a valid link.');
        }

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ʀᴇʟᴢ ᴋᴇʏsʏsᴛᴇᴍ - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ᴋᴇʏ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ʀᴇʟᴢ ᴋᴇʏsʏsᴛᴇᴍ - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function rblx(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

            const supportButton = new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

            const actionRow = new ActionRowBuilder()
                .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://keyrblx.com/getkey')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const bypass_endpoints = [
        'https://keyrblx.com/getkey'
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    const final_api_url = 
          `https://16d3-2402-800-6273-3dd7-a9-67aa-9fec-cfe8.ngrok-free.app/api/keyrblx/?url=${link}`;

console.log(final_api_url);

    try {
        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;

        const bypass_result = primary_response.key;
        if (!bypass_result) {
            throw new Error('Key not found. Please try again with a valid link.');
        }

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ᴋᴇʏʀʙʟx - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ᴋᴇʏ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ᴋᴇʏʀʙʟx - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function vegax(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
    
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://pandadevelopment.net/getkey?service=vegax&hwid=')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    try {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const hwid = urlParams.get('hwid');

        if (!hwid) {
            throw new Error('HWID not found in the link. Please provide a valid link.');
        }

        const final_api_url = `https://stickx.top/api-vegax/?hwid=${encodeURIComponent(hwid)}&api_key=tUnAZj3sS74DJo9BUb8tshpVhpLJLA`;

        console.log('API URL:', final_api_url);

        await interaction.deferReply({ ephemeral: false });

        const response = await axios.get(final_api_url);

        if (response.status !== 200 || !response.data.key) {
            throw new Error('Something went wrong, try again later!');
        }

        const bypass_result = response.data.key;
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ᴠᴇɢᴀx - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ᴋᴇʏ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        console.error('Error:', error);

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ᴠᴇɢᴀx - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function Project(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

            const supportButton = new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

            const actionRow = new ActionRowBuilder()
                .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://projectl.xyz/')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const bypass_endpoints = [
        'https://projectl.xyz/'
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    const final_api_url = 
          `${Endpoint}/api/bypass?link=${link}&api_key=${apiKey}`;

console.log(final_api_url);

    try {
        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        if (response.status !== 200) {
            throw new Error('Something went wrong, try again later!');
        }

        const primary_response = response.data;

        const bypass_result = primary_response.key;
        if (!bypass_result) {
            throw new Error('Key not found. Please try again with a valid link.');
        }

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ᴘʀᴏᴊᴇᴄᴛʟ - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ᴋᴇʏ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ᴋᴇʏ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ᴘʀᴏᴊᴇᴄᴛʟ - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function lootlink(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Thay bằng liên kết mời bot của bạn

            const supportButton = new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/UQjPG97yYV'); // Thay bằng liên kết máy chủ hỗ trợ của bạn

            const actionRow = new ActionRowBuilder()
                .addComponents(inviteButton, supportButton);

if (!link.startsWith("https://loot-link.com") && 
    !link.startsWith("https://loot-links.com") && 
    !link.startsWith("https://lootdest.com") &&
    !link.startsWith("https://lootdest.org")) {
    await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
    return;
}

    const bypass_endpoints = [
           "https://loot-link.com",
           "https://loot-links.com",
           "https://lootdest.com",
           "https://lootdest.org"
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    const final_api_url = 
          `https://api.bypass.vip/bypass?url=${link}`;

console.log(final_api_url);

    try {
        await interaction.deferReply({ ephemeral: false });
        const response = await axios.get(final_api_url);

        const primary_response = response.data;
        
        if (response.data.status !== "success") {
            throw new Error('Bypass Failed Please Try Again Later!')
        }

        const bypass_result = primary_response.result;
        if (!bypass_result) {
            throw new Error('Key not found. Please try again with a valid link.');
        }

        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle('<a:uptimer:1264888502022307892> ʟᴏᴏᴛʟɪɴᴋs - sᴜᴄᴄᴇss')
            .setColor(0xf08080)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .addFields({ name: `[🔑] - __ʟɪɴᴋ ʙʏᴘᴀssᴇᴅ__`, value: `${box}${bypass_result}${box}`, inline: false},
                       { name: `[🔑] - __ʟɪɴᴋ ʙʏᴘᴀssᴇᴅ (ʜᴏʟᴅ ᴛᴏ ᴄᴏᴘʏ)__`, value: `${bypass_result}`})
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    } catch (error) {
        const user = interaction.user;
        const avatar_url = user.displayAvatarURL();

        const embed = new EmbedBuilder()
            .setTitle('<a:offline:1264894843306377299> ʟᴏᴏᴛʟɪɴᴋs - ᴇʀʀᴏʀ')
            .setColor(0xFF2A04)
            .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey })
            .setThumbnail(avatar_url)
            .setTimestamp(Date.now())
            .setDescription(`${box}${error.message}${box}`)
            .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
        await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
    }
}

async function arceus(interaction) {
    const link = interaction.fields.getTextInputValue('link');
    const box = '```';
    
    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Me')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1265214436197666837'); // Replace with your bot's invite link

    const supportButton = new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/UQjPG97yYV'); // Replace with your support server link

    const actionRow = new ActionRowBuilder()
        .addComponents(inviteButton, supportButton);

    if (!link.startsWith('https://spdmteam.com')) {
        await interaction.reply({ content: 'Invalid link format!', ephemeral: true });
        return;
    }

    const bypass_endpoints = [
        'https://spdmteam.com'
    ];

    const api_url = bypass_endpoints.find(endpoint => link.startsWith(endpoint));

    if (!api_url) {
        await interaction.reply({ content: 'This link is under maintenance or not supported', ephemeral: true });
        return;
    }

    try {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const hwid = urlParams.get('hwid');

        if (!hwid) {
            throw new Error('HWID not found in the link. Please provide a valid link.');
        }

        const final_api_url = `https://stickx.top/api-arceusx/?hwid=${hwid}&api_key=tUnAZj3sS74DJo9BUb8tshpVhpLJLA`;

        console.log(final_api_url);

        try {
            await interaction.deferReply({ ephemeral: false });
            const response = await axios.get(final_api_url);

            if (response.status !== 200) {
                throw new Error('Something went wrong, try again later!');
            }

            const primary_response = response.data;
            const bypass_result = primary_response.key;

            if (response.data.Status == "Success") {
                throw new Error('Bypass failed, please try again later.');
            }
            
            if (bypass_result == "Key System completed!") {
                throw new Error('Key not found. Please try again with a valid link.');
            }

            const user = interaction.user;
            const avatar_url = user.displayAvatarURL();
            const embed = new EmbedBuilder()
                .setTitle('<a:uptimer:1264888502022307892> ᴀʀᴄᴇᴜs x - sᴜᴄᴄᴇss')
                .setColor(0xf08080)
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Replace 'iconlink' and 'monkey' with valid URLs
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setDescription(`${box}Successfuly Whitelisted.${box}`)
                .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter }); // Replace 'OwnerName' and 'iconfooter' with valid values

            await interaction.editReply({ embeds: [embed], components: [actionRow] });
            await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
        } catch (error) {
            const user = interaction.user;
            const avatar_url = user.displayAvatarURL();

            const embed = new EmbedBuilder()
                .setTitle('<a:offline:1264894843306377299> ᴀʀᴄᴇᴜs x - ᴇʀʀᴏʀ')
                .setColor(0xFF2A04)
                .setAuthor({ name: rlowisgay, iconURL: iconlink, url: monkey }) // Replace 'iconlink' and 'monkey' with valid URLs
                .setThumbnail(avatar_url)
                .setTimestamp(Date.now())
                .setDescription(`${box}${error.message}${box}`)
                .setFooter({ text: `${OwnerName} | Request By ${user.username}`, iconURL: iconfooter }); // Replace 'OwnerName' and 'iconfooter' with valid values

            await interaction.editReply({ embeds: [embed], components: [actionRow] });
            await interaction.followUp({ content: `https://discord.gg/UQjPG97yYV`, ephemeral: true });
        }
    } catch (error) {
        await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
    }
}

client.login(token);
