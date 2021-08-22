const Discord = require("discord.js");
require("dotenv-flow").config();
const bot = new Discord.Client();

const fs = require('fs');
//const allRoles = readFromFile

const prefix = "!";

// TODO LIST:
// fix the env issue
// find json solution for storing roles

// put these in an env
const chanID = process.env.CHAN_ID;
const guildID = process.env.GUILD_ID;
//console.log("Chan ID: " + chanID + "\nGuild ID: " + guildID)
//console.log(process.env)
const roles = {
    '🐷': "787212472666685460",
    '🐸': "787212690388418570"
}
//const roles = readFromFile()


// outputs that the bot is logged in and pins the instruction message to the general channel
function onReady(){
    console.log('Logged in as ' + bot.user.tag)

    const channel = bot.channels.cache.get(chanID)
    const embed = new Discord.MessageEmbed
    embed.setTitle("Welcome to Audri's server!")
    embed.setDescription("Here are some commands:\n"
            + "**" + prefix + "pin** followed by a message to quickly pin something\n"
            + "**" + prefix + "clean** followed by 'all' or an integer between 0 and 98 "
                + "to delete a number of previous messages in the channel\n"
            + "**" + prefix + "roles** to assign yourself roles\n"
            + "**" + prefix + "nick** followed by a name to give yourself a new nickname!\n"
            + "**" + prefix + "invite** to create an invite link to the server\n"
            + "**" + prefix + "new** to create a new role")
    embed.setColor([157, 193, 131])
    channel.send(embed)
        .then(msg => msg.pin())
        .catch(console.error)
    readFromFile
}

// handles calls to !pin, !clean, and does nothing otherwise
function onMessage(message) {
    if (message.author.bot || message.author == bot.user) {
        //console.log('Ignored bot message')
        return
        }
    if (message.content.startsWith(prefix + "pin")) {
        pinIt(message)
    } else if (message.content.startsWith(prefix + "clean")) {
        cleanChan(message)
    } else if (message.content.startsWith(prefix + "roles")) {
        roleReact(message)
    } else if (message.content.startsWith(prefix + "nick")){
        newNick(message)
    } else if (message.content.startsWith(prefix + "invite")){
        createInvite(message)
    } else if (message.content.startsWith(prefix + "new")) {
        createRole(message)
    }
}

// REQUIRES: (string) message to be written after the !pin
// sends a message with desired content and pins it, deleting the user's !pin call
function pinIt(message) {
    //message.channel.send("@" + message.author.username + " wrote:\n " + message.content.substr(5))
    message.channel.send(message.content.substr(4))
        .then(msg => msg.pin())
        .then(console.log)
        .catch(console.error)
    message.delete()
}

// REQUIRES: an integer i between 1-98 inclusive to follow !clean
//          if user confirms they want to clean the channel, i messages are deleted as well as the last "!clean" call
//          if user cancels, message is sent reaffirming cancellation
//          if user does nothing after 30 seconds, message is sent reaffirming that the user did nothing,
//          and this message is deleted after an additional 10 seconds 
function cleanChan(message) {
    // counts how many messages the user wants to delete
    let num
    if (message.content.substr(7) === "all") {
        num = 98
    } else {
        num = parseInt(message.content.substr(6))
    }

    // confirmation message
    message.reply("Are you sure you want to delete the last " + num + " messages? Click 👍 to continue and 👎 to cancel.")
    message.react('👍')
    message.react('👎')

    // sees if the user reacted with one of two possible emoji reacts
    const filter = (reaction, user) => {
        return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
    }

    message.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first()
            // deletes bot messages, call to clean, and desired number of messages
            if (reaction.emoji.name === '👍') {
                if (message.channel.type = "text") {
                    message.channel.bulkDelete(num + 2)
                        .then(messages => console.log("Deleted " + messages.size + " messages"))
                        .catch(console.error)
                }
            }   else {
                    // deletes the bot message and call to clean
                    message.channel.bulkDelete(2)
                    message.channel.send(message.author.username + " cancelled cleaning the channel")
                }
            })
            .catch(() => {
                // handles case where user doesn't react within 30 seconds
                message.reply("You didn't react within 30 seconds of calling !clean")
                .then(msg => {
                    setTimeout(() => {
                        msg.delete()
                        message.delete()
                    }, 10000) 
            })})
}

// EFFECTS: If user reacts to pinned message with pig or frog emoji AND they don't have that
//          role already, they receive that role. If they react twice to a role they have,
//          that role will be removed.
function roleReact(message) {
    const roleEmbed = new Discord.MessageEmbed
    roleEmbed.setTitle("Roles")
    roleEmbed.setDescription("🐷: Peppa Pig\n"
        + "🐸: Kermit the Frog")
    roleEmbed.setColor([198, 181, 217])
    
    message.channel.send(roleEmbed).then(async msg => {
        msg.react('🐷')
        msg.react('🐸')
        const emojis = Object.keys(roles)
        for (const emoji of emojis) {
            await msg.react(emoji)
        }
        const collector = msg.createReactionCollector(({emoji}) => emojis.includes(emoji.name))
        // Handles role assignment once emoji is clicked
        collector.on('collect', ({emoji, message}, user) => {
            message.guild.members.fetch(user).then(member => {
                // Case where user already has role
                if (member.roles.cache.has(roles[emoji.name])) {
                    message.reply("You already have that role!")
                } else {
                    // Case where user gets new role
                    member.roles.add(roles[emoji.name])
                    console.log(user.tag + " reacted with " + emoji.name + " role")
                    message.guild.roles.fetch(roles[emoji.name])
                        .then(role => message.reply("Congrats! You are now " + role.name))
                }
            })
        })
        // Note: Seems like there are some widespread issues with the "remove" event,
        //       so this function might not work until the next update
        collector.on('remove', ({emoji, message}, user) => {
            message.guild.members.fetch(user).then(member => {
                console.log(user.username + " removed a role")
                if (member.roles.cache.has(roles[emoji.name])) {
                    console.log(user.username + " has the role they want to remove")
                    member.roles.remove(roles[emoji.name])
                    message.guild.roles.fetch(roles[emoji.name])
                        .then(role => message.reply("You are no longer " + role.name))
                }
            })
        })
    })
}

// REQUIRES: non-null string to follow !nick
// replaces the user's nickname with desired name
//          ONLY IF the user is not the owner/higher in hierarchy than the bot
function newNick(message) {
    let newName = message.content.substr(6).toString()
    message.member.setNickname(newName)
    .catch(console.error)
    console.log(newName)
    message.reply("love the new look, " + message.member.nickname)
}

// Creates a temporary invite when reacted with '😄', and a permanent invite with '🤩'
function createInvite(message) {
    const server = bot.guilds.fetch(guildID)
    const channel = bot.channels.cache.get(chanID)
    
    // handles the emoji reactions for invite customization
    message.reply("React with '😄' for a temporary invite, and '🤩' for a permanent invite")
        .then(msg =>
            {
                msg.react('😄')
                msg.react('🤩')
                const filter = (reaction, user) => {
                    return ['😄','🤩'].includes(reaction.emoji.name) && user.id === message.author.id;
                }
                // handles emoji reactions
                msg.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
                    .then(collected => {
                        const reaction = collected.first()
                        if (reaction.emoji.name === '😄') {
                            channel.createInvite({maxUses: 1, maxAge: 60000, guild: server, temporary: true})
                            .then(invite => {
                                message.reply("Here's an invite code: http://discord.gg/" + invite.code)
                            })
                        } else {
                            channel.createInvite(
                                {maxUses: 1, maxAge: 0, guild: server, temporary: false})
                                .then(invite => {
                                    message.reply("Here's an invite code: http://discord.gg/" + invite.code)
                                })
                        }})
                        .catch(() => {
                            // handles case where user doesn't react within 30 seconds
                            message.reply("Invite cancelled; you didn't specify a time")
                            .then(msg => {
                                setTimeout(() => {
                                    msg.delete()
                                    message.delete()
                                }, 10000) 
                        })})
            })
}

// asks the user for the name of the role and its associated emoji,
//          creates the role with that info, and saves the new role in the emojis.json file
function createRole(message) {
    message.reply("Enter a name for this role")
        .then(function() {
            // collect the role name
            const messageFilter = msg => msg.author.id === message.author.id
            const collector = message.channel.createMessageCollector(messageFilter, {max: 1, time: 60000})
            collector.on("collect", collected => {
                // save the role name
                let roleName = collected.content
                message.reply("Now react to this message with the associated emoji")
                .then(msg => {
                    // filter for desired emoji
                    const emojiFilter = (reaction, user) => {
                        return user.id === message.author.id
                    }
                    msg.awaitReactions(emojiFilter, { max: 1, time: 30000, errors: ['time'] })
                        .then(collected => {
                            //collect desired emoji
                            let roleEmoji = collected.first().emoji.name
                            msg.guild.roles.create({
                                data: {
                                    name: roleName
                                }
                            })
                    console.log(roleName + " " + roleEmoji + " created")
                    //push to emojis.json
                    pushToFile(roleName, roleEmoji)        
                })
                })
                })
            })
}

// function pushToFile(roleName, roleEmoji) {
//     allRoles.set(roleName, roleEmoji)
//     JSON.stringify(allRoles)

// }

function readFromFile() {
    fs.readFile('./emojis.json', 'utf8', (err, jsonString) => {
        if (err) {
            console.log("Could not read emojis.json: ", err)
            return
        }
        console.log('Successfully reading emojis.json: ', jsonString) 
        let roleMap = new Map
        for (var value in jsonString) {  
            roleMap.set(value,jsonString[value])  
            }  
        console.log(roleMap.size)
        return roleMap
    })
}

// async function onReaction(msgReaction) {
//     const message = await msgReaction.message
//     const emoji = await msgReaction.emoji.name
//     if (emoji === '🎃') {
//         message.delete
//     }
// }

// function welcome(member) {
//     console.log("Someone joined the server!")
//     const welcomeChannel = "790460653856882709"
//     const embed = new Discord.MessageEmbed
//     //const newUsers = new Discord.Collection();
//     //newUsers.set(member.id, member.user)
//     const name = member.displayName
//     console.log(name)
//     embed.setDescription("Welcome, " + name + "!")
//     embed.setColor([117,255,255])
//     member.guild.channels.get(welcomeChannel).send(embed)
//         .catch(console.error)
// }


bot.on('ready', onReady);
bot.on('message', onMessage);
//bot.on("messageReactionAdd", onReaction)
bot.on('presenceUpdate', function(oldStatus, newStatus){
    console.log("Status update observed")
    if (oldStatus.presence.status !== newStatus.presence.status) {
        const welcomeChannel = "790460653856882709"
        const embed = new Discord.MessageEmbed
        const name = newStatus.presence.member.displayName
        console.log(name)
        embed.setDescription("Welcome, " + name + "!")
        embed.setColor([117,255,255])
        member.guild.channels.get(welcomeChannel).send(embed)
            .catch(console.error)
    }})
bot.login();