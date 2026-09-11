// Shell prefix: load nvm + user npm globals (non-interactive SSH has no PATH).
const SH =
	'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; ' +
	'export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:/usr/local/bin:$PATH"; ';

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

			// First time only: pm2 deploy ecosystem.config.cjs production setup
			"post-setup": SH + "npm install -g pm2 && pm2 -v",

			"pre-deploy":
				SH +
				"git pull && cd backend && cp ../../shared/.env.local .env.local",

			"post-deploy":
				SH +
				"command -v pm2 >/dev/null || npm install -g pm2; " +
				"cd backend && npm install && " +
				"(pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || pm2 start ecosystem.config.cjs) && " +
				"pm2 save && pm2 status",
		},
	},
};
