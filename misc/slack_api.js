const SlackBot = require("slackbots");

const address = 'http://192.168.1.35:5000';

// const params = {icon_url: "https://naacp.org/sites/default/files/styles/large/public/images/1_Jamal_Watkins_0.jpg?itok=EgFSQS8a"};
const params = {icon_url: "https://naacp.org/sites/default/files/styles/large/public/images/1_Jamal_Watkins_0.jpg?itok=EgFSQS8a"};
const jamalToken = "REDACTED_SLACK_BOT_TOKEN";

// create a bot
const bot = new SlackBot({
    token: jamalToken, // Add a bot https://my.slack.com/services/new/bot and put the token
    name: "Appifire Checker",
});

bot.on("start", () => {      
    console.log("Bot started")
    
    // Post to another user's slackbot channel instead of a direct message
    // bot.postMessageToUser(abds, "meow!", {...params, slackbot: true});
});

bot.on("error", (err) => {
    console.error("Unexpected Bot Error");
    reject(err)
});

function notifyChannel(channel, message){
      return new Promise((resolve, reject) => {
          bot.postMessageToChannel(channel, message, params)
          .then((data) => resolve())
          .fail((res) => reject(res));
      });
}

function notifyUser(user, message){     
    return new Promise((resolve, reject) => {
        bot.postMessageToUser(user, message, params)
        .then((_) => {console.log("user notified"); resolve()})
        .fail((res) => {console.error("Could not notify user"); reject(res)});
      });

}


const main = async () => {
    await notifyUser("gh.abds", "*build started* _italic_ <https://appifire.io| See more>");
    await notifyUser("gh.abds", "Join <#C025D136YB0> for more info");
    // await notifyUser("gh.abds", "Message 2");
    // await notifyChannel("general", "Remed server is not accessible!");
    // try {
    //     const resp = await fetch(`${address}/ping`, {method : "POST"}).then(r => r.text());
    //     console.log(`Remed server is reachable at ${resp}`);
    // } catch (error) {
    //     console.log(`Remed server at ${address} is NOT reachable!`);
    //     await notifyUser("gh.abds", "Remed server is not accessible!");
    // } finally{
    //     console.log("Done! retrying...");
    //     setTimeout(main, 60000);
    // }

}

main();



// module.exports = {notifyChannel, notifyUser}
