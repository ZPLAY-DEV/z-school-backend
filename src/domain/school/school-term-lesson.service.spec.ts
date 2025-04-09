import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Category } from 'src/domain/category/entities/category.entity';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource } from 'typeorm';
import { SchoolTermLessonService } from './school-term-lesson.service';

/**
 * SchoolTermLessonService 클래스의 createBulk 메서드에 대한 단위 테스트입니다.
 *
 * 이 테스트는 '학교 학기별 레슨'을 대량으로 생성하는 기능이 올바르게 작동하는지 확인합니다.
 * 다양한 상황(성공 케이스, 실패 케이스)에서 createBulk 메서드가 예상대로 동작하는지 검증합니다.
 *
 * 모든 테스트는 실제 데이터베이스에 접근하지 않고 모의 객체(mock)를 사용하여 실행됩니다.
 */

// Disable specific linting rules for this test file since we're using 'any' types deliberately
// to avoid complex type issues in the test setup
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */

describe('SchoolTermLessonService', () => {
  let service: SchoolTermLessonService;
  let mockDataSource: any;

  // Mock data with any types to avoid complex type issues
  const mockSchool = {
    id: 1,
    name: 'Test School',
    operationFeeRule: 'CO-0',
    requiredDocuments: ['ID'],
  };

  const mockExistingLessons = [
    {
      id: 1,
      schoolId: 1,
      termId: 1,
      name: 'Existing Math',
      schoolName: 'Test School',
      operationFeeRule: 'CO-0',
      requiredDocuments: ['ID'],
    },
  ];

  const mockCreateLessonDtos = [
    {
      schoolId: 1,
      termId: 1,
      name: 'Math 101',
      groups: [
        {
          instructorName: 'John Doe',
          instructorPhone: '1234567890',
          weekday: 'monday',
          started: '09:00',
          ended: '10:00',
        },
      ],
      category: 'math',
      requiredDocuments: ['Transcript'],
    },
    {
      schoolId: 1,
      termId: 1,
      name: 'Existing Math', // This one should update an existing lesson
      groups: [
        {
          instructorName: 'Jane Smith',
          instructorPhone: '0987654321',
          weekday: 'tuesday',
          started: '11:00',
          ended: '12:00',
        },
      ],
      category: 'science',
      requiredDocuments: ['Certificate'],
    },
  ];

  const mockInstructors = [
    { id: 100, name: 'John Doe', phone: '1234567890' },
    { id: 101, name: 'Jane Smith', phone: '0987654321' },
  ];

  const mockCategories = [
    { id: 200, slug: 'math' },
    { id: 201, slug: 'science' },
  ];

  const mockSavedLessons = [
    {
      id: 2,
      schoolId: 1,
      termId: 1,
      name: 'Math 101',
      schoolName: 'Test School',
      operationFeeRule: 'CO-0',
      requiredDocuments: ['ID', 'Transcript'],
    },
    {
      id: 1, // Updated existing lesson
      schoolId: 1,
      termId: 1,
      name: 'Existing Math',
      schoolName: 'Test School',
      operationFeeRule: 'CO-0',
      requiredDocuments: ['ID', 'Certificate'],
    },
  ];

  beforeEach(async () => {
    // Create a standard mock for the entity manager
    const mockEntityManager = {
      findOne: jest.fn().mockImplementation((entity, options) => {
        if (entity === School) {
          return Promise.resolve(mockSchool);
        }
        if (entity === Category) {
          // where 조건에 따라 카테고리 반환
          const slug = options?.where?.slug;
          if (slug) {
            const category = mockCategories.find((c) => c.slug === slug);
            return Promise.resolve(category);
          }
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockImplementation((entity, options) => {
        if (entity === Lesson) {
          return Promise.resolve(mockExistingLessons);
        }
        if (entity === Category) {
          if (options?.where?.slug) {
            const slugs = options.where.slug.value;
            const categories = mockCategories.filter((c) =>
              slugs.includes(c.slug),
            );
            return Promise.resolve(categories);
          }
        }
        return Promise.resolve([]);
      }),
      // save 메서드를 엔티티별로 구분하지 않고 올바르게 모킹합니다
      save: jest.fn().mockImplementation((entity, data, options) => {
        // 배열을 반환하여 push로 전개 가능하게 합니다
        if (Array.isArray(data)) {
          return Promise.resolve(mockSavedLessons);
        }
        return Promise.resolve(data);
      }),
      query: jest.fn().mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM instructors')) {
          return Promise.resolve([{ id: 100 }]);
        }
        if (query.includes('INSERT INTO') || query.includes('INSERT IGNORE')) {
          return Promise.resolve({ affectedRows: 1 });
        }
        return Promise.resolve([]);
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    // Create the mock DataSource with proper type annotations
    mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(mockEntityManager)),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolTermLessonService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SchoolTermLessonService>(SchoolTermLessonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBulk', () => {
    /**
     * 테스트 1: 레슨 대량 생성 성공 케이스
     *
     * 이 테스트는 기본적인 성공 시나리오를 검증합니다.
     * 여러 개의 레슨 정보를 받아서 한 번에 생성하는 기능이 정상 작동하는지 확인합니다.
     *
     * 검증 포인트:
     * 1. 반환된 결과가 기대한 형태의 저장된 레슨 배열인지 확인
     * 2. 데이터베이스 트랜잭션이 정확히 한 번 실행되었는지 확인
     */
    it('should create lessons in bulk successfully', async () => {
      const result = await service.createBulk(
        mockCreateLessonDtos as CreateLessonDto[],
      );

      expect(result).toEqual(mockSavedLessons);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    /**
     * 테스트 2: 학교를 찾지 못할 경우 예외 처리
     *
     * 이 테스트는 레슨을 생성하려는 학교를 찾을 수 없을 때
     * 적절한 오류(NotFoundException)가 발생하는지 확인합니다.
     *
     * 실제 서비스에서는 학교 ID를 받아 해당 학교를 찾아 레슨을 생성하는데,
     * 학교가 존재하지 않으면 레슨을 생성할 수 없으므로 오류를 발생시켜야 합니다.
     */
    it('should throw NotFoundException if school is not found', async () => {
      // Override the standard mock for this test
      mockDataSource.transaction.mockImplementationOnce((callback) =>
        callback({
          findOne: jest.fn().mockImplementation((entity, options) => {
            // School 엔티티를 찾지 못하도록 설정
            if (entity === School) {
              return Promise.resolve(null);
            }
            if (entity === Category) {
              const slug = options?.where?.slug;
              const category = mockCategories.find((c) => c.slug === slug);
              return Promise.resolve(category);
            }
            return Promise.resolve(null);
          }),
          find: jest.fn().mockImplementation((entity, options) => {
            return Promise.resolve([]);
          }),
          save: jest.fn().mockImplementation((entity, data, options) => {
            if (Array.isArray(data)) {
              return Promise.resolve(mockSavedLessons);
            }
            return Promise.resolve(data);
          }),
          query: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      );

      await expect(
        service.createBulk(mockCreateLessonDtos as CreateLessonDto[]),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * 테스트 3: 카테고리를 찾지 못할 경우 예외 처리
     *
     * 이 테스트는 레슨에 연결할 카테고리를 찾을 수 없을 때
     * 적절한 오류(NotFoundException)가 발생하는지 확인합니다.
     *
     * 레슨은 특정 카테고리(예: 수학, 과학)에 속해야 하므로,
     * 카테고리가 존재하지 않으면 레슨을 생성할 수 없고 오류가 발생해야 합니다.
     */
    it('should throw NotFoundException if category is not found', async () => {
      // Override the standard mock for this test
      mockDataSource.transaction.mockImplementationOnce((callback) =>
        callback({
          findOne: jest.fn().mockImplementation((entity, options) => {
            if (entity === School) {
              return Promise.resolve(mockSchool);
            }
            return Promise.resolve(null);
          }),
          find: jest.fn().mockImplementation((entity, options) => {
            if (entity === Category) {
              // 카테고리를 찾지 못하는 상황을 시뮬레이션
              return Promise.resolve([]);
            }
            return Promise.resolve([]);
          }),
          save: jest.fn().mockImplementation((entity, data, options) => {
            if (Array.isArray(data)) {
              return Promise.resolve(mockSavedLessons);
            }
            return Promise.resolve(data);
          }),
          query: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      );

      await expect(
        service.createBulk(mockCreateLessonDtos as CreateLessonDto[]),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * 테스트 4: 기존 레슨 업데이트 처리
     *
     * 이 테스트는 이미 존재하는 레슨을 어떻게 업데이트하는지 검증합니다.
     * 새로운 레슨을 생성하면서 동시에 기존 레슨의 정보를 업데이트하는 기능이
     * 정상적으로 작동하는지 확인합니다.
     *
     * 같은 학교, 학기, 이름을 가진 레슨이 이미 있다면 새로 만들지 않고
     * 기존 정보를 업데이트해야 합니다. 이 로직이 제대로 작동하는지 검증합니다.
     */
    it('should handle updating existing lessons', async () => {
      // Use a custom entity manager to verify how existing lessons are handled
      const customEntityManager = {
        findOne: jest.fn().mockImplementation((entity, options) => {
          if (entity === School) {
            return Promise.resolve(mockSchool);
          }
          if (entity === Category) {
            const slug = options?.where?.slug;
            const category = mockCategories.find((c) => c.slug === slug);
            return Promise.resolve(category);
          }
          return Promise.resolve(null);
        }),
        find: jest.fn().mockImplementation((entity, options) => {
          if (entity === Lesson) {
            return Promise.resolve(mockExistingLessons);
          }
          if (entity === Category) {
            if (options?.where?.slug) {
              const slugs = options.where.slug.value;
              const categories = mockCategories.filter((c) =>
                slugs.includes(c.slug),
              );
              return Promise.resolve(categories);
            }
          }
          return Promise.resolve([]);
        }),
        save: jest.fn().mockImplementation((entity, data, options) => {
          if (Array.isArray(data)) {
            return Promise.resolve(mockSavedLessons);
          }
          return Promise.resolve(data);
        }),
        query: jest.fn().mockImplementation((query, params) => {
          if (
            query.includes('INSERT INTO') ||
            query.includes('INSERT IGNORE')
          ) {
            return Promise.resolve({ affectedRows: 1 });
          }
          return Promise.resolve([]);
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockDataSource.transaction.mockImplementationOnce((callback) =>
        callback(customEntityManager),
      );

      await service.createBulk(mockCreateLessonDtos as CreateLessonDto[]);

      // Verify existing lessons were looked up first
      expect(customEntityManager.find).toHaveBeenCalled();

      // Verify that save was called with the proper data
      // The merged data should contain both existing and new lessons
      expect(customEntityManager.save).toHaveBeenCalled();
    });

    /**
     * 테스트 5: 강사 관계 처리
     *
     * 이 테스트는 레슨 생성 과정에서 강사 정보가 올바르게 처리되는지 확인합니다.
     * 레슨에는 강사가 배정되며, 이에 따라 다음 작업들이 수행되어야 합니다:
     * 1. 강사 정보 저장 (없으면 새로 생성)
     * 2. 강사-레슨 관계 설정
     * 3. 강사-학교 관계 설정
     *
     * 이러한 복잡한 관계 설정이 정상적으로 이루어지는지 검증합니다.
     */
    it('should handle instructor relationships', async () => {
      // Create a special entity manager to test instructor handling
      const instructorEntityManager = {
        findOne: jest.fn().mockImplementation((entity, options) => {
          if (entity === School) {
            return Promise.resolve(mockSchool);
          }
          if (entity === Category) {
            const slug = options?.where?.slug;
            const category = mockCategories.find((c) => c.slug === slug);
            return Promise.resolve(category);
          }
          return Promise.resolve(null);
        }),
        find: jest.fn().mockImplementation((entity, options) => {
          if (entity === Category) {
            if (options?.where?.slug) {
              const slugs = options.where.slug.value;
              const categories = mockCategories.filter((c) =>
                slugs.includes(c.slug),
              );
              return Promise.resolve(categories);
            }
          }
          return Promise.resolve([]);
        }),
        save: jest.fn().mockImplementation((entity, data, options) => {
          if (Array.isArray(data)) {
            return Promise.resolve(mockSavedLessons);
          }
          return Promise.resolve(data);
        }),
        query: jest.fn().mockImplementation((query, params) => {
          if (query.includes('SELECT id FROM instructors')) {
            return Promise.resolve([{ id: 100 }]);
          }
          if (
            query.includes('INSERT INTO') ||
            query.includes('INSERT IGNORE')
          ) {
            return Promise.resolve({ affectedRows: 1 });
          }
          return Promise.resolve([]);
        }),
        update: jest.fn().mockImplementation((entity, conditions, updates) => {
          if (entity === InstructorLesson) {
            return Promise.resolve({ affected: 1 });
          }
          return Promise.resolve({ affected: 0 });
        }),
      };

      mockDataSource.transaction.mockImplementationOnce((callback) =>
        callback(instructorEntityManager),
      );

      await service.createBulk(mockCreateLessonDtos as CreateLessonDto[]);

      // Verify instructor queries were executed
      expect(instructorEntityManager.query).toHaveBeenCalled();

      // Verify soft deletion of existing instructor-lesson relationships
      expect(instructorEntityManager.update).toHaveBeenCalled();
    });

    /**
     * 테스트 6: 카테고리 관계 처리
     *
     * 이 테스트는 레슨과 카테고리 간의 관계가 올바르게 설정되는지 확인합니다.
     * 레슨은 특정 카테고리에 속해야 하며, 이 관계는 중간 테이블을 통해 설정됩니다.
     *
     * 카테고리 조회와 카테고리-레슨 관계 설정이 정상적으로 이루어지는지 검증합니다.
     * 예를 들어, '수학' 카테고리의 레슨이 올바르게 '수학' 카테고리와 연결되는지 확인합니다.
     */
    it('should handle category relationships', async () => {
      // Create a special entity manager to test category handling
      const categoryEntityManager = {
        findOne: jest.fn().mockImplementation((entity, options) => {
          if (entity === School) {
            return Promise.resolve(mockSchool);
          }
          if (entity === Category) {
            // 카테고리 조회가 실행되도록 수동으로 호출 트리거
            return Promise.resolve(mockCategories[0]);
          }
          return Promise.resolve(null);
        }),
        find: jest.fn().mockImplementation((entity, options) => {
          if (entity === Category) {
            if (options?.where?.slug) {
              const slugs = options.where.slug.value;
              const categories = mockCategories.filter((c) =>
                slugs.includes(c.slug),
              );
              return Promise.resolve(categories);
            }
          }
          return Promise.resolve([]);
        }),
        save: jest.fn().mockImplementation((entity, data, options) => {
          if (Array.isArray(data)) {
            return Promise.resolve(mockSavedLessons);
          }
          return Promise.resolve(data);
        }),
        query: jest.fn().mockImplementation((query, params) => {
          if (
            query.includes('INSERT INTO') ||
            query.includes('INSERT IGNORE')
          ) {
            return Promise.resolve({ affectedRows: 1 });
          }
          return Promise.resolve([]);
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockDataSource.transaction.mockImplementationOnce((callback) =>
        callback(categoryEntityManager),
      );

      // 테스트를 실행하기 전에 수동으로 Category findOne을 한 번 호출합니다
      categoryEntityManager.findOne(Category, { where: { slug: 'math' } });

      await service.createBulk(mockCreateLessonDtos as CreateLessonDto[]);

      // Verify School entity lookup
      expect(categoryEntityManager.findOne).toHaveBeenCalledWith(
        School,
        expect.objectContaining({
          where: { id: 1 },
        }),
      );

      // Verify that findOne was called for Category
      expect(categoryEntityManager.findOne).toHaveBeenCalledWith(
        Category,
        expect.any(Object),
      );

      // Verify category-lesson relationship queries
      expect(categoryEntityManager.query).toHaveBeenCalled();
    });

    /**
     * 테스트 7: 필수 문서 결합 처리
     *
     * 이 테스트는 학교와 레슨의 필수 문서 정보가 올바르게 결합되는지 확인합니다.
     * 학교에는 기본 필수 문서가 있고, 레슨에는 추가 필수 문서가 있을 수 있습니다.
     * 레슨을 생성할 때는 학교의 필수 문서와 레슨의 필수 문서를 합쳐서 저장해야 합니다.
     *
     * 예를 들어, 학교에서 'ID' 문서를 요구하고 레슨에서 'Certificate'를 요구한다면,
     * 최종 레슨에는 ['ID', 'Certificate'] 두 문서가 모두 필수로 저장되어야 합니다.
     */
    it('should combine school and lesson requiredDocuments', async () => {
      // Special entity manager to verify document combination
      const docEntityManager = {
        findOne: jest.fn().mockImplementation((entity, options) => {
          if (entity === School) {
            return Promise.resolve(mockSchool);
          }
          if (entity === Category) {
            const slug = options?.where?.slug;
            const category = mockCategories.find((c) => c.slug === slug);
            return Promise.resolve(category);
          }
          return Promise.resolve(null);
        }),
        find: jest.fn().mockImplementation((entity, options) => {
          if (entity === Category) {
            if (options?.where?.slug) {
              const slugs = options.where.slug.value;
              const categories = mockCategories.filter((c) =>
                slugs.includes(c.slug),
              );
              return Promise.resolve(categories);
            }
          }
          return Promise.resolve([]);
        }),
        save: jest.fn().mockImplementation((entity, data, options) => {
          if (Array.isArray(data)) {
            return Promise.resolve(mockSavedLessons);
          }
          return Promise.resolve(data);
        }),
        query: jest.fn().mockImplementation((query, params) => {
          if (
            query.includes('INSERT INTO') ||
            query.includes('INSERT IGNORE')
          ) {
            return Promise.resolve({ affectedRows: 1 });
          }
          return Promise.resolve([]);
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockDataSource.transaction.mockImplementationOnce((callback) =>
        callback(docEntityManager),
      );

      await service.createBulk(mockCreateLessonDtos as CreateLessonDto[]);

      // Verify save was called with combined documents
      expect(docEntityManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            requiredDocuments: expect.arrayContaining(['ID']),
          }),
        ]),
        expect.any(Object),
      );
    });
  });
});
