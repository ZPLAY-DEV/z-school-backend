module.exports = {
  apps: [
    {
      name: 'v3',
      script: './dist/main.js',
      instances: 1,
      watch: false,
      merge_logs: false,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      out_file: '~/.pm2/logs/v3-access.log',
      error_file: '~/.pm2/logs/v3-error.log',
      autorestart: true,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
