module.exports = {
	apps: [{
		name: "myclinic-api",
		script: "src/index.ts",
		interpreter: "node",
		node_args: "--import tsx",
		env: {
			BACKEND_PORT: 3100,
			BACKEND_HOST: "0.0.0.0",
			NODE_ENV: "production",
			WHATSAPP_WORKER_AUTO_START: "false",
		},
	}],

	deploy: {
		production: {
			user: "ubuntu",
			host: "13.239.83.200",
			ref: "origin/main",
			repo: "git@github.com:Myenum2412/MyClinics.git",
			path: "/var/www/myclinic",
			"pre-deploy": "git pull && cd backend && cp ../../shared/.env.local .env.local",
			"post-deploy": "cd backend && npm install && pm2 reload ecosystem.config.cjs --update-env",
		},
	},
};
