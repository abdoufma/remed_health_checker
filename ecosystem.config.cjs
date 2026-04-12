module.exports = {
  apps: [
    {
      name: "health_checker",
      script: "./index.js",
      node_args: "--env-file=.env",
    },
  ],
};
