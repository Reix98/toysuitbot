# Toy suit Bot
This is a node module that contains a toy suit application for your Discord server. This application is created by [Hexblue][HexTwitter] and is currently running on [this][discord] discord server.

## Usage

### Commands
| Command  | What it does                                    |
|----------|-------------------------------------------------|
| `!ping`  | Checks if the bot is responding and prints pong |
| `!debug` | Turns on debugging                              |

#### Toysuit commands
| Command                                         | What it does                                         |
|-------------------------------------------------|------------------------------------------------------|
| `!toysuit <username>`                           | Puts a user in a toy suit (you if none is specified) |
| `!release <username>`                           | Releases a user from the suit                        |
| `!free <username>`                              | Resets the toys statistic                            |
| `!safeword`                                     | The toy frees itself from the suit                   |
| `!remove_safeword`                              | Removes the ability to use the safeword              |
| `!info <username>`                              | Provides information about a user / toy              |
| `!setinfo` or `!set_info`                       | Sets information about a toy                         |
| `!kinks <username>`                             | Gets the kinks of a toy                              |
| `!set_kinks`                                    | Sets the kinks of a toy                              |
| `!setnickname` or `!set_nickname`               | Sets the nickname of a toy                           |
| `!settimer` or `!set_timer`                     | Sets a timer how long the suit has to be worn        |
| `!timer`                                        | Gets the time remaining                              |
| `!cleartimer` or `!clear_timer`                 | Removes the time constrain                           |
| `!settoytype` or `!set_toy_type`                | Sets the type of toy (alpha, beta or omega)          |
| `!toytype <username>` or `!toy_type <username>` | Gets the toy type                                    |
| `!settimerbonus` or `!set_timer_bonus`          | Sets a timer bonus                                   |
| `!triggerbonus` or `!trigger_bonus`             | Triggers a bonus for the toy                         |
| `!control <username>`                           | Takes complete control over the toy (can't speak)    |
| `!gag <username>`                               | Gags the toy (everything it says is muffled)         |
| `!say <username>, <message>`                    | Make the toy suit say something as the toy           |
| `!voice <username>, <message>`                  | Make the toy suit emmit a voice to the toy           |
| `!me <action>`                                  | You doing something                                  |
For more information on what these states mean please consult the wiki.

### The system
Users are grouped in two types. Doms and subs (the toys). A dom can not be toy suited and the toys are divided into tree
different groups.
* Alpha (α) = Dominant
* Beta (β)  = Switch
* Omega (ω) = Submissive

This ranking also effects who can toy suit who. An alpha toy can toysuit every other toy category where as omegas
 can not toy suit any other group.

Furthermore every toy has a score. Like `α\[12%\]` this means that the toy is a 12% good toy. Negative amounts mean that
the toy is behaving bad. The score of the toy affects how the toy suit reacts to the wearer. For example a bad toy has a
higher chance of the toy suit replacing words. 

## For developers
If you want to help with the development of this bot, just fork and clone this repository. In order to also set up your own discord server for testing, follow these steps.

1\. Install node and npm on your computer

2\. Create a `auth.json` file with this contents:
```json
{
   "token": "YOUR-BOT-TOKEN"
}
```
> You can get the token for your bot after you set it up. Follow this [guide][bot-guide] on how to do so:

3\. Install dependencies: `npm install` in the bot's main directory.

4\. Run the bot `node main.js`

If you want to test if the setup worked, just write `!ping` on the server and the bot will respond with a **private message** `Pong()`.


[HexTwitter]: https://twitter.com/Rei98
[discord]: https://discord.gg/K95DJAp
[bot-guide]: https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token