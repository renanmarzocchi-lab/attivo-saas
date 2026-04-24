// ecosystem.config.cjs — PM2 process manager
// Gerencia backend e frontend em produção na VPS.
//
// Uso:
//   pm2 start ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs   (zero-downtime)
//   pm2 save                          (persiste após reboot)
//   pm2 startup                       (inicia PM2 no boot)

module.exports = {
  apps: [
    // ─── Backend Fastify ────────────────────────────────────────────────────
    {
      name:      'attivo-backend',
      script:    'src/server.js',
      cwd:       '/opt/attivo/backend',
      instances: 1,        // Aumentar para 'max' se tiver 4+ CPUs
      exec_mode: 'fork',   // Usar 'cluster' com múltiplas instâncias
      // node_args removido: --experimental-specifier-resolution foi removido no Node.js 20
      // O backend usa ESM com extensões .js explícitas — não precisa de flags extras

      env: {
        NODE_ENV: 'production',
        PORT:     3333,
      },

      // Reinício automático
      watch:         false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts:  10,

      // Logs
      out_file:  '/var/log/attivo/backend.log',
      error_file:'/var/log/attivo/backend.error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ─── Frontend Next.js ────────────────────────────────────────────────────
    {
      name:   'attivo-frontend',
      script: 'node_modules/.bin/next',
      args:   'start -p 3000',
      cwd:    '/opt/attivo/frontend',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        PORT:     3000,
        NEXT_PUBLIC_API_URL: 'https://api.attivocorretora.com.br/api/v1',
      },

      watch: false,
      max_memory_restart: '768M',
      restart_delay: 3000,
      max_restarts:  10,

      out_file:   '/var/log/attivo/frontend.log',
      error_file: '/var/log/attivo/frontend.error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
