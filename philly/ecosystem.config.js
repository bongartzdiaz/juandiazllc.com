/* PM2 ecosystem config — production process manager
   Usage:
     pm2 start ecosystem.config.js --env production
     pm2 save && pm2 startup   # auto-start on reboot
     pm2 reload philly-dashboard   # zero-downtime reload
     pm2 logs philly-dashboard
*/

module.exports = {
  apps: [
    {
      name: 'philly-dashboard',
      cwd: __dirname,

      // Run the Next.js standalone server — tiny, no npm/node_modules needed
      script: '.next/standalone/server.js',

      instances: 'max',           // one process per CPU core; use 1 for small VPS
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,               // never watch in prod; redeploy via pm2 reload
      max_memory_restart: '500M', // safety net against slow leaks

      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        HOSTNAME: '0.0.0.0',      // listen on all interfaces so Nginx can reach
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3100,
        HOSTNAME: '0.0.0.0',
      },

      // Log rotation — PM2 will create these; tail with `pm2 logs`
      output: './logs/out.log',
      error: './logs/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Wait up to 10s for a graceful shutdown before killing
      kill_timeout: 10_000,

      // Process must emit 'ready' within 30s of start or pm2 considers it failed
      listen_timeout: 30_000,
    },
  ],
}
