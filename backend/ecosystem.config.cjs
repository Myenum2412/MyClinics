module.exports = {
  apps: [
    {
      name: "myclinic-backend",
      cwd: "/home/ubuntu/myclinics-backend",
      script: "src/index.ts",
      interpreter: "node",
      node_args: "--import tsx",
      kill_timeout: 10000,
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: 5000,
    },
    {
      name: "myclinic-whatsapp",
      cwd: "/home/ubuntu/myclinics-backend",
      script: "src/services/whatsapp/whatsapp.worker.ts",
      interpreter: "node",
      node_args: "--import tsx",
      kill_timeout: 10000,
      restart_delay: 3000,
      max_restarts: 20,
      min_uptime: 5000,
    },
  ],
};