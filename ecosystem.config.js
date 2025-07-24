module.exports = {
  apps: [
    {
      name: 'api',
      script: './dist/main.js',
      instances: 1,
      watch: false,
      merge_logs: false,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      combine_logs: true,
      out_file: '~/.pm2/logs/api-combined.log',
      error_file: '~/.pm2/logs/api-combined.log',
      autorestart: true,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'dev',
      },
    },
    {
      name: 'ngrok',
      script: 'ngrok', // ngrok 명령 실행
      args: 'start --all --config="/home/chuck/snap/ngrok/280/.config/ngrok/ngrok.yml"',
      interpreter: 'none', // Node.js 인터프리터 사용 안함
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      out_file: '~/.pm2/logs/ngrok-access.log',
      error_file: '~/.pm2/logs/ngrok-error.log',
    },
  ],
};
