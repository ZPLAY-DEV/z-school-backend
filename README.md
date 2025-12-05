## Description

z-school backend application

## S3 BUCKET STRUCTURES

- excels : common
- icons : common
- images: common
- syllabuses
  - 1
    - week1
      - cover
      - fullVideo
      - intro
      - miniVideo
      - silhouette
      - stories
      overview.png
      overview.mp3
      story.mp4
    - week2
      - cover
      - fullVideo
      - intro
      - miniVideo
      - silhouette
      - stories
      overview.png
      overview.mp3
      story.mp4
    - week3
      : 
- schools
  - 1
    - students
      - {studentId}-filename.jpg
- input
  - schools
    - 1
      - groups
        - 28
          - file.jpg (수업중캡쳐사진)

## Project setup

```bash
$ git clone https://github.com/ZPLAY-DEV/z-school-backend.git
$ cd z-school-backend
$ pnpm install
$ touch .env
$ docker compose up -d
$ pnpm start:dev
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

LocalStack 을 사용하기 때문에, `docker compose up -d` 후 정상동작이 가능하다. 기본 제공하는 `docker-compose.yml` 의 설정은, /Users/Shared/docker 라는 절대경로에 모든 데이터가 저장된다.

아래의 두개 폴더에서 람다함수를 각각 설치해야한다. 설치설명은 각각의 리포 리드미 정보에서 찾아 볼 수 도 있다.

- https://github.com/ZPLAY-DEV/v3-sqs-lambda
- https://github.com/ZPLAY-DEV/v3-events-lambda

## Swagger (Docs)

- http://localhost:3001/docs

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
  
1. local 환경에서, 4566 포트로 터널링하는 랜덤주소를 .env 의 AWS_CLOUDFRONT_URL 값으로 설정한다.
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

## TypeORM

### 주요 subscriber

> Subscriber 로직은 **code cohesion** 이 떨어지기 때문에, 오류가 나는 경우 디버깅이 쉽지 않다. 따라서, 가급적 사용하지 않았고, 현재 사용중인 Subscriber 들은 기억을 상기 시키기 위해서 아래에 정리한다.

1. TermSubscriber

- `term.bookingStart` 가 변경되는 경우, 처음 설정되는 상황인지 파악하여 처음 설정되는 경우, offering 을 생성한다.

1. OfferingSubscriber

- `offering.prepickedStudentIds` 가 변경되는 경우, 항상 picked 수를 update 한다.

1. SchooldaySubscriber

- `schoolday.startsAt` 이 변경되는 경우, original (변경전 시작일) 과 today (변경후 시작일) 을 저장하고, 또한, 아직 수업 전 이라면 관련 다이나모 출석부에 그날 선통보 결석 내용이 있는 경우, 필요없어지므로 삭제.
