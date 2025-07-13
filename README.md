## Description

z-school backend application

## AVOID OVER-ENGINEERING

좋은 엔지니어링은 "완벽한 코드"가 아니라 "비즈니스 가치를 만드는 코드"입니다. 🚀

## Project setup

```bash
$ git clone https://github.com/ZPLAY-DEV/z-school-backend.git  # clone repo
$ cd z-school-backend # move repo
$ pnpm install # dependency install (npm i -g pnpm)
$ touch .env.development .env.production # create environment  => https://www.notion.so/v3-Enviroment-Setup-1d24351cd47a80a7963fd12488874d4f
$ docker compose up -d
$ pnpm start:dev # start dev mode 
```
- `docker-compose.yml` and `.env` files are available @
[notion wiki] (https://www.notion.so/v3-Enviroment-Setup-1d24351cd47a80a7963fd12488874d4f)

## Compile and run the project

```bash
# development
$ pnpm start

# watch mode
$ pnpm start:dev

# production mode
$ pnpm start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Docker Container

AWS 다양한 인프라를 사용하고 있기 때문에, 반드시 `docker-compose up -d` 해야만 정상동작이 가능하다. 기본적으로 /Users/Shared/docker 라는 절대경로로 지정한 폴더하위에 모든 데이터가 저장되도록 만들었으나, 일부 sqs 나 lambda 는 persist 되지 않아서 재부팅시 마다 다시 실행해야하는 경우도 있다.

아래의 두개 폴더에서 람다함수를 각각 설치해야한다. 설치설명은 각각의 리포 리드미 정보에서 찾아 볼 수 도 있다.

- https://github.com/ZPLAY-DEV/v3-sqs-lambda
- https://github.com/ZPLAY-DEV/v3-events-lambda

## Swagger (Api Docs)

- http://localhost:3001/api-docs

## ngrok 으로 실행

1. pm2 start ecosystem.config.js 로 2개 application 실행
  - v3
  - ngrok

2. 현재 API 에서 LocalStack 을 사용하려면, ngrok tunnel 이 2개 필요하기 때문에, ngrok 명령 설치 후 `ngrok config add-authtoken xxxxxx` 했을때 생성되는 이를 ~/snap/ngrok/200/.config/ngrok/ngrok.yml 을 찾아서 아래와 같이 tunnels 을 추가 지정한다.
  ```yaml
version: "3"
agent:
    authtoken: xxxxxx

tunnels:
  api:
    addr: 3001
    proto: http
    domain: ferret-guided-lightly.ngrok-free.app
  localstack:
    proto: http
    addr: 4566
  ssh:
    proto: tcp
    addr: 127.0.0.1:22
  ```

  localstack 이나 ssh 의 경우, hostname 을 지정하여, subdomain 을 사용하면 편리한데, 이는 유료기능이다. 따라서, 매번 reload 할때 마다 dynamic 하게 바뀌는 주소를 사용해야 한다. `curl http://localhost:4040/api/tunnels` 라고 입력하면, localstack 은 `https://abb1-58-122-170-34.ngrok-free.app`, ssh 는 `tcp://0.tcp.jp.ngrok.io:13485` 처럼 출력된다. (따라서 ssh 접속시, ssh user@0.tcp.jp.ngrok.io -p 13485 와 같이 입력한다.)
  
1. local 환경에서, 4566 포트로 터널링하는 랜덤주소를 .env.development 의 AWS_CLOUDFRONT_URL 값으로 사용하면 된다.
2. 아래와 같이 api 로 명명된 nestjs application 만 reload 한다. (전체 reload 하면 주소가 바뀌어져 버린다.)

```bash
pm2 reload api
```

## Deployment

몇몇 동작을 위해서는 기본적으로 seed 값이 있어야만 합니다. 아래 생성순서대로 seed 데이터 생성을 추천합니다.

1. 사용자 생성 (Postman 의 auth)
2. 사용자 로그인 (Postman 의 auth)
3. 학교 생성 (Postman 의 학교)
4. 학기 생성 (Postman 의 학기)
5. 늘봄분류 seed (Postman 의 늘봄분류)
6. 학교 > 학생 seed (Postman 의 학교 > 학생 bulk 생성 seed)
7. 학교 > 학사일정 생성 (Postman 의 학교 > 학사일정)
8. 학교 > 늘봄학기 > 과목 bulk 생성 (Postman 의 학교 > 블봄학기 > 과목)
9. 학교 > 늘봄학기 > 수강신청과목 bulk 생성 (Postman 의 수강신청과목)

## Seed

  - `node test/db-seed.js`
  - `node test/db-book.js`
  - `node test/db-pack.js`
