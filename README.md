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

docker 에서 사용하는 서비스들의 데이터 저장공간을 project folder 안에 생성되도록 하지 않고 data 용 folder 를 별도로 만들어 사용했습니다. 기본적으로 /Users/Shared/docker 라는 절대경로로 지정한 폴더하위에 모든 데이터가 저장되도록 만들었습니다.

- localstack : AWS sqs, lambda, dynamodb 인프라를 로컬에서 사용하기 위함.
- mysql 8.0 : v3 에서 사용할 db 입니다. 배포시 aurora serverless 사용할 예정.
- mariadb 10.11 : v2 에서 사용한 db 입니다.
  - mariadb 에 있는 내용을 v3 테이블로 마이그레이션 할때 대비해서 2개를 넣었습니다.
  - mysql 와 mariadb 는 같은 포트를 사용해서, 포트 충돌 방지를 위해 3306이 아닌 2306 으로 변경
- postgres : 테스트 용으로 넣은 것입니다. (삭제 가능)

## Swagger (Api Docs)

- http://localhost:3001/api-docs


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
9. 학교 > 늘봄학기 > 수강신청과목 bulk 생성 (Postman 의 수강신청과목) 또는 Term > 늘봄학기 수정 (수강신청기간) 입력하면 해당 학교 해당 학기의 offerings 생성됨
10. 수강신청입력 (각각 10건 20건 입력가능. 첫번째 사용자)
  - `node test/booking-anyone.js`
  - `node test/booking-first.js`

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
$ pnpm install @aws-sdk/client-eventbridge
$ pnpm install @aws-sdk/client-lambda
```


## Resources

