// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
const { WebClient, LogLevel } = require("@slack/web-api");
const jamalToken = "REDACTED_SLACK_BOT_TOKEN";
// WebClient instantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(jamalToken, { logLevel: LogLevel.WARN });

const data = {
  token: 'REDACTED_SLACK_APP_TOKEN',
  team_id: 'T025D136R2S',
  context_team_id: 'T025D136R2S',
  context_enterprise_id: null,
  api_app_id: 'A025S0AAMUL',
  event: {
    client_msg_id: 'ec9127a6-2384-4d5d-8598-35c11f12dc34',
    type: 'message',
    text: '<@U04KVDXMU65> test 2',
    user: 'U025YCY8CPK',
    ts: '1678130650.066749',
    blocks: [ [Object] ],
    team: 'T025D136R2S',
    channel: 'C025D136YB0',
    event_ts: '1678130650.066749',
    channel_type: 'channel'
  },
  type: 'event_callback',
  event_id: 'Ev04TAKCFPLY',
  event_time: 1678130650,
  authorizations: [
    {
      enterprise_id: null,
      team_id: 'T025D136R2S',
      user_id: 'U025YCY8CPK',
      is_bot: false,
      is_enterprise_install: false
    }
  ],
  is_ext_shared_channel: false,
  event_context: '4-eyJldCI6Im1lc3NhZ2UiLCJ0aWQiOiJUMDI1RDEzNlIyUyIsImFpZCI6IkEwMjVTMEFBTVVMIiwiY2lkIjoiQzAyNUQxMzZZQjAifQ'
}

async function findConversation(name) {
    try {
        // const user = await client.users.lookupByEmail({email : "gh.abds@gmail.com"});

      // Call the conversations.list method using the built-in WebClient
    //   const convos = await client.users.conversations();
    //   console.log(convos);
    client.chat.postMessage({});
    const convo = await client.conversations.open({users : "U025YCY8CPK"});
    // convo.channel.
    console.log(convo.channel.id)
      const {ok, channels} = await client.conversations.list({});
      if (ok){
        // console.log(channels)
          const foundConvo = channels.filter(c => c.name === name)[0];
          foundConvo != undefined 
          ? console.log("Found conversation ID: " + foundConvo.id)
          : console.log("Not found");
      }
    }
    catch (error) {
      console.error(error);
    }
  }


  async function reply(){
    try {
      const {event} = data;
      if(event.type === "message" && event.subtype !== "bot_message"){
        const {user} = await client.users.info({user : event.user});
        console.log(user.profile.first_name);
        await client.chat.postMessage({channel : event.channel,  thread_ts : event.ts, text : `Hi, <${event.user}>`});
      }
    } catch (err) {
      console.error(err);
    }
  }
  
  // Find conversation with a specified channel `name`
  // findConversation("appifire");
  reply();
