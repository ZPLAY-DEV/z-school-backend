import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferingIndexes20250717213848 implements MigrationInterface {
  name = 'AddOfferingIndexes20250717213848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // schoolId, termId 복합 인덱스 추가 (가장 중요한 인덱스) - 이미 성공적으로 생성됨
    await queryRunner.query(
      `CREATE INDEX IDX_offering_school_term ON offerings (schoolId, termId)`,
    );

    // allowedGrades는 TEXT 타입이므로 prefix index 사용 (처음 100자만 인덱싱)
    // FIND_IN_SET 최적화에는 제한적이지만 일부 도움이 됨
    await queryRunner.query(
      `CREATE INDEX IDX_offering_allowed_grades ON offerings (allowedGrades(100))`,
    );

    // schoolId 단독 인덱스 (혹시 모를 상황 대비)
    await queryRunner.query(
      `CREATE INDEX IDX_offering_school_id ON offerings (schoolId)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 제거 (역순으로)
    await queryRunner.query(`DROP INDEX IDX_offering_school_id ON offerings`);
    await queryRunner.query(
      `DROP INDEX IDX_offering_allowed_grades ON offerings`,
    );
    await queryRunner.query(`DROP INDEX IDX_offering_school_term ON offerings`);
  }
}
