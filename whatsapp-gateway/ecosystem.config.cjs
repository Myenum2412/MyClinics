module.exports = {
  apps: [
    {
      name: "whatsapp-gateway",
      script: "src/index.ts",
      interpreter: "node",
      node_args: "--import tsx",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        GATEWAY_PORT: 4100,
      },
    },
  ],
};
