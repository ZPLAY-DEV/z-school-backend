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
    {
      name: 'ngrok',
      script: 'ngrok', // ngrok 명령 실행
      args: 'start --all --config=/Users/zplaydev/.ngrok2/ngrok.yml',
      interpreter: 'none', // Node.js 인터프리터 사용 안함
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      out_file: '~/.pm2/logs/ngrok-access.log',
      error_file: '~/.pm2/logs/ngrok-error.log',
      env: {
        NGROK_AUTHTOKEN: '2ychfJzYcCOl5IwWnKSmo1BVfNJ_3jmzBC9NdMT8ApqrVin8o', // 이미 설정돼 있다면 생략 가능
      },
    },
  ],
};
