## Description

z-school backend application

## Project setup

```bash
$ git clone https://github.com/ZPLAY-DEV/z-school-backend.git  # clone repo
$ cd z-school-backend # move repo
$ pnpm install # dependency install (npm i -g pnpm)
$ touch .env.development .env.production # create environment  => https://www.notion.so/v3-Enviroment-Setup-1d24351cd47a80a7963fd12488874d4f
$ docker compose up -d
$ pnpm start:dev # start dev mode 
```
- Look at the .env setup file written on the note  
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

docker 에서 사용하는 서비스들의 데이터 저장공간을 project folder 가 아니라 data 용 folder 를 별도로 만들어 사용했습니다. 기본적으로 /Users/Shared/docker 라는 절대경로로 지정한 폴더하위에 모든 데이터가 저장되도록 만들었습니다. 이렇게 절대경로를 사용하는 경우, 임시 project 에서 작업하다 삭제하더라도 데이터는 남아있기 때문에 이런 설정을 선호하는데, 다른 의견있으면 공유주세요.

- localstack : AWS sqs, lambda, dynamodb 인프라를 로컬에서 사용하기 위함.
- mysql 8.0 : v3 에서 사용할 db 입니다. 배포시 aurora serverless 사용할 예정.
- mariadb 10.11 : v2 에서 사용한 db 입니다.
  - mariadb 에 있는 내용을 v3 테이블로 마이그레이션 할때 대비해서 2개를 넣었습니다.
  - mysql 와 mariadb 는 같은 포트를 사용해서, 포트 충돌 방지를 위해 3306이 아닌 2306 으로 변경
- postgres : 테스트 용으로 넣은 것입니다. (삭제 가능)


## Swagger (Api Docs)

- http://localhost:3001/api-docs


## Deployment


## Migration

```bash
# 작성
```

## Module & Package

```bash
# 작성 
$ pnpm install cross-env
$ pnpm install http-status-codes 
$ pnpm install dotenv 
$ pnpm install uuid
$ pnpm install multer
$ pnpm install 
$ pnpm install redis ioredis
$ pnpm install @nestjs/mapped-types
$ pnpm install multer
$ pnpm install qs 
$ pnpm install uuid 
$ pnpm install @nestjs/terminus @nestjs/axios # health check module
```


## Resources

