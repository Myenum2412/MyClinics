module.exports = {
	apps: [
		{
			name: "myclinic-api",
			script: "src/index.ts",
			interpreter: "node",
			node_args: "--import tsx",
			instances: 1,
			exec_mode: "fork",
			max_memory_restart: "400M",
			env: {
				BACKEND_PORT: 3100,
				BACKEND_HOST: "0.0.0.0",
				NODE_ENV: "production",
				WHATSAPP_WORKER_AUTO_START: "false",
			},
		},
		{
			name: "myclinic-whatsapp",
			script: "src/services/whatsapp/whatsapp.worker.ts",
			interpreter: "node",
			node_args: "--import tsx --max-old-space-size=512",
			instances: 1,
			exec_mode: "fork",
			max_memory_restart: "900M",
			restart_delay: 5000,
			max_restarts: 20,
			min_uptime: "30s",
			env: {
				NODE_ENV: "production",
				WHATSAPP_SESSION_PATH: "/var/www/myclinic/shared/whatsapp-session",
				WHATSAPP_MAX_CLINIC_SESSIONS: "5",
			},
		},
	],

	deploy: {
		production: {
			user: "ubuntu",
			host: "13.239.83.200",
			ref: "origin/main",
			repo: "git@github.com:Myenum2412/MyClinics.git",
			path: "/var/www/myclinic",
			"pre-deploy": "git pull && cd backend && cp ../../shared/.env.local .env.local",
			"post-deploy": "cd backend && npm install --omit=dev && pm2 reload ecosystem.config.cjs --update-env && pm2 save",
		},
	},
};
