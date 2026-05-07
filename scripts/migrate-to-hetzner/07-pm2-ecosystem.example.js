// 07-pm2-ecosystem.example.js
// What this does:
//   PM2 ecosystem for the Next.js app on the Hetzner box.
//   Cluster mode (4 workers) for zero-downtime reload.
//   Reads .env.production from /home/deus/website/.env.production
//   so secrets never sit in the repo.
//
// Install:
//   pm2 startOrReload ~/website/scripts/migrate-to-hetzner/07-pm2-ecosystem.example.js
//   pm2 save
//
// Tweak `instances` if the box gets busier — start at 4, raise to 8
// before considering the next box.

module.exports = {
  apps: [
    {
      name: 'deus-web',
      cwd: '/home/deus/website',
      script: 'npm',
      args: 'run start',
      // cluster mode → PM2 spawns N copies, load-balances incoming
      // connections across them. Zero-downtime reload with `pm2 reload`.
      exec_mode: 'cluster',
      instances: 4,

      // Environment is sourced from .env.production via Next.js's
      // built-in dotenv loading — nothing to set here for secrets.
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // expose the boot timestamp so /philly/api/health can show it
        DEUS_BOOTED_AT: new Date().toISOString(),
      },

      // restart policy
      max_memory_restart: '1500M',  // generous; standalone server runs ~500 MB
      restart_delay: 4000,           // wait 4 s between restart attempts
      max_restarts: 5,               // 5 in 60 s → mark errored
      min_uptime: '60s',             // anything that dies in <60s = real fail

      // node tunables
      node_args: '--max-old-space-size=2048',

      // log handling — pm2 writes to ~/.pm2/logs/<app>-out.log etc.
      // We rotate via pm2-logrotate (install separately, see runbook).
      out_file: '/home/deus/.pm2/logs/deus-web-out.log',
      error_file: '/home/deus/.pm2/logs/deus-web-error.log',
      merge_logs: true,
      time: true,

      // signal Next.js to flush analytics + close DB pools cleanly
      kill_timeout: 8000,
      shutdown_with_message: false,
    },
  ],
}
