module.exports = {
    apps: [{
      name: "luluxbot",
      script: "./dist/index.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    }]
  }