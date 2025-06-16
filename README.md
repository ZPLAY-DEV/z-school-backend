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

### sqs 설정

- 아래 명령들을 cli 형태로 입력.


```bash
awslocal sqs create-queue --queue-name dead
awslocal sqs create-queue --queue-name main --attributes '{"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:ap-northeast-2:000000000000:dead\",\"maxReceiveCount\":\"2\"}"}'

```

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

