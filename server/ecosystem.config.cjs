// Configuração do PM2 — mantém a API sempre no ar.
// Comandos: npm run api:start | api:status | api:logs | api:restart | api:stop
module.exports = {
  apps: [
    {
      name: 'elixir-api',
      script: 'src/index.js',
      cwd: __dirname,
      node_args: '--env-file-if-exists=.env',
      // ⚠️ NÃO usar cluster — 1 processo só: SQLite (1 escritor), gateway WebSocket do Discord,
      // Maps em memória (códigos OAuth/reset/2FA, intents de crypto) e o cron checkExpiredPlans.
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' }, // garante produção mesmo se o .env esquecer
      autorestart: true,        // caiu → levanta sozinho
      restart_delay: 1000,      // espera 1s entre tentativas
      max_restarts: 50,
      out_file: './logs/api.log',
      error_file: './logs/api-error.log',
      time: true,               // timestamps nos logs
    },
  ],
}
