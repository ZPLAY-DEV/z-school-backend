import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStudentEscortFields20250718060230
  implements MigrationInterface
{
  name = 'UpdateStudentEscortFields20250718060230';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 요일별 JSON 컬럼들 추가
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN monday JSON NULL COMMENT '월요일 보호자 전화번호 및 하교 목적지'`,
    );
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN tuesday JSON NULL COMMENT '화요일 보호자 전화번호 및 하교 목적지'`,
    );
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN wednesday JSON NULL COMMENT '수요일 보호자 전화번호 및 하교 목적지'`,
    );
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN thursday JSON NULL COMMENT '목요일 보호자 전화번호 및 하교 목적지'`,
    );
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN friday JSON NULL COMMENT '금요일 보호자 전화번호 및 하교 목적지'`,
    );
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN saturday JSON NULL COMMENT '토요일 보호자 전화번호 및 하교 목적지'`,
    );

    // 기존 데이터 마이그레이션 (escortPhone과 nextStop이 있는 경우 monday로 이동)
    await queryRunner.query(`
      UPDATE students 
      SET monday = JSON_OBJECT('phone', escortPhone, 'nextStop', nextStop)
      WHERE escortPhone IS NOT NULL OR nextStop IS NOT NULL
    `);

    // 기존 컬럼들 제거
    await queryRunner.query(`ALTER TABLE students DROP COLUMN escortPhone`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN nextStop`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 기존 컬럼들 복원
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN escortPhone VARCHAR(16) NULL COMMENT '보호자 전화번호'`,
    );
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN nextStop VARCHAR(32) NULL COMMENT '하교후 목적지'`,
    );

    // 월요일 데이터를 기존 컬럼으로 복원
    await queryRunner.query(`
      UPDATE students 
      SET 
        escortPhone = JSON_UNQUOTE(JSON_EXTRACT(monday, '$.phone')),
        nextStop = JSON_UNQUOTE(JSON_EXTRACT(monday, '$.nextStop'))
      WHERE monday IS NOT NULL
    `);

    // 요일별 JSON 컬럼들 제거 (역순으로)
    await queryRunner.query(`ALTER TABLE students DROP COLUMN saturday`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN friday`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN thursday`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN wednesday`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN tuesday`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN monday`);
  }
}
