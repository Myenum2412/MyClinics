module.exports = {
  apps: [
    {
      name: "myclinic-backend",
      cwd: "/home/ubuntu/myclinics-backend",
      script: "npm",
      args: "run start",
      kill_timeout: 10000,
      restart_delay: 2000,
    },
    {
      name: "myclinic-whatsapp",
      cwd: "/home/ubuntu/myclinics-backend",
      script: "npm",
      args: "run whatsapp",
      kill_timeout: 10000,
      restart_delay: 3000,
      max_restarts: 20,
    },
  ],
};
