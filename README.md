## Description

z-school backend application

## Project setup

```bash
$ git clone https://github.com/ZPLAY-DEV/z-school-backend.git  # clone repo
$ cd z-school-backend # move repo
$ pnpm install # dependency install 
$ touch .env.development .env.production # create environment
# Look at the .env setup file written on the note  
[notion wiki] (https://www.notion.so/v3-Enviroment-Setup-1d24351cd47a80a7963fd12488874d4f)

$ docker compose up 
$ pnpm start:dev # start dev mode 
```

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

```bash
# 작성 
```

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

afterschool 수업 강사의 강좌 리스트를 등록하는 UI 를 개발중이다.
- school 과 terms 는 1:M 관계이다.
- term 과 lessons 는 1:M 관계이다.
- lesson 은 강좌명,한줄설명,1회강사비,배열형태의교재비,배열형태의재료비,이용비,강사에게요구되는legal문서리스트 이 prop 으로 존재하고 각각의 lesson 별 모든 항목의 사용자 입력이 필요하다.
- lesson 과 groups 는 1:M 관계이다.
- instructor 와 group 은 1:M 관계이다.
- group 은 lesson 별 하위 입력란에서 [반이름,수강가능최저학년,수강가능최고학년,수업종류,요일,시작시간,종료시간,담당선생님이름,담당선생님전화번호,강의실,학생정원수] 값을 갖는 array of array 형태로 지정할 수 있다.

- lesson 과 instructor 는 N:M 관계이며 위의 입력사항으로 자동 추가/갱신되므로 입력UI는 필요없다.
- school 과 instructor 는 N:M 관계이며 위의 입력사항으로 자동 추가/갱신되므로 입력UI는 필요없다.

## Prompt

As a 10x developer, you need to fully rewrite  LessonService@create() concisely and efficiently. 
The followings are the updated requirements

제공하는 CreateLessonDto 를 사용하여 Lesson 을 Upsert 한다.
- Lesson 의 @Unique(['termId', 'schoolName', 'name']) 가 unique 하므로 이를 이용하여 upsert 수행.
- Lesson 의 schoolName 의 값은 `${dto.schoolId}:${dto.schoolName}` 으로 저장한다. 이는 dto.schoolName 의 속성이 optional 이기 때문이다.
- dto 에는 InstructorIds 가 없다. 대신 dto.groups 의 InstructorName 과 InstructorPhone 을 이용하여, InstructorIds 를 추출해야한다. Instructor 의 name 과 phone 이 Unique 하기 때문에 테이블에 존재하지 않는 경우 새로운 record 를 생성한다. 그런 다음 Lesson 에 관련된 모든 InstructorIds 를 쿼리로 구할 수 있다.
- Lesson 테이블에 upsert 하는 것 이외에, Lesson:Instructor, School:Instructor, Category:Lesson 의 관계 pivot 테이블 레코드도 추가한다.
  - 엄밀히 말하면, Lesson:Instructor, School:Instructor, Category:Lesson 의 관계 레코드는 언제 삭제해야하는지 판별이 난해하기때문에 무조건 생성하는 것이 best practice 인것 같다. 더 좋은 방법이 있다면 추천해달라.
