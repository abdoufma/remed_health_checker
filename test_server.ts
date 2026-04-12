export default Bun.serve({
  websocket: {
    open: (ws) => console.log("Client connected"),
    message: (ws, message) => console.log("Client sent message", message),
    close: (ws) => console.log("Client disconnected"),
  },
  routes : {
    '/' : (_) => new Response(`<h2>Test Health Server</h2>`),
    '/health' : (_) => new Response(`Server is Healthy`, {status : 200}),
    '/data' : (_) => Response.json({data : "Random data"}),
    '/timeout' : async (_) => {
        await Bun.sleep(8000);
        return Response.json({marco : "polo"}, {status : 200});
    },
    '/error' : (_) => new Response(`Server is Down`, {status : 500}),
    '/empty' : (_) => new Response(null, {status : 204}),
    '/connection-refused' : (_) => new Response(null, {status : 503}),
    '/crash' : (_) => {
      throw new Error("Server crashed");
    },
    '/server-down' : () => process.exit(1),
    '/random' : async (_) => {
      let rand = Math.random();
      if (rand > 2/3) return new Response(`Server is Healthy`, {status : 200});
      if (rand > 1/3) {
        await Bun.sleep(2000);
        return new Response(`Server is Down`, {status : 500});
      }
      process.exit(1);
    }
  },
  fetch : (req) => new Response(`${new URL(req.url).pathname} not found`, {status : 404}),
//   development : true
});



// console.log(`Test health server running at http://localhost:${server.port}`);