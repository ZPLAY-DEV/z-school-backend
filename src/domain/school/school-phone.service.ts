import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, UpdateResult } from 'typeorm';
import { Phone } from '../phone/entities/phone.entity';
import { CreatePhoneDto } from '../phone/dto/create-phone.dto';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { School } from '../school/entities/school.entity';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
@Injectable()
export class SchoolPhoneService {
  private readonly logger = new Logger(SchoolPhoneService.name);

  constructor(
    @InjectRepository(Phone)
    private readonly phoneRepository: Repository<Phone>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? 학교 발신번호 등록
  async create(dto: CreatePhoneDto): Promise<Phone> {
    // 1) 학교 존재 여부 확인
    const school = await this.schoolRepository.exists({
      where: {
        id: dto.schoolId,
      },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2) 학교에 등록된 동일한 번호가 있는지 조회.
    const phone = await this.phoneRepository.findOne({
      where: {
        phone: dto.phone,
        school: {
          id: dto.schoolId,
        },
      },
    });

    if (phone) {
      throw new ConflictException(HttpErrorConstants.DUPLICATE_PHONE);
    }

    // 3) 학교에 등록된 번호가 있는지 조회.
    const isSchoolEnrolledPhone = await this.phoneRepository.exists({
      where: {
        school: {
          id: dto.schoolId,
        },
      },
    });

    // 4) Phone 엔티티 생성 ( 최초 등록 시 활성 여부 true, 아니면 false )
    const phoneEntity = this.phoneRepository.create({
      phone: dto.phone,
      school: { id: dto.schoolId },
      isActive: !isSchoolEnrolledPhone,
    });

    // 5) 저장
    return await this.phoneRepository.save(phoneEntity);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  //? 학교 발신번호 전체 조회
  async findAll(schoolId: number): Promise<Phone[]> {
    return await this.phoneRepository.find({
      select: {
        id: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      where: {
        school: { id: schoolId },
      },
    });
  }

  //? 학교 발신번호 페이징 조회
  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Phone>> {
    const queryBuilder = this.phoneRepository
      .createQueryBuilder('phone')
      .where('phone.schoolId = :schoolId', { schoolId });

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'phone', 'isActive'],
      searchableColumns: ['phone'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        schoolYear: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  //? 학교의 활성화된 발송번호 조회
  async findActivePhone(schoolId: number): Promise<Phone | null> {
    return await this.phoneRepository.findOne({
      select: {
        id: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      where: {
        school: { id: schoolId },
        isActive: true,
      },
    });
  }

  //?-------------------------------------------------------------------------//
  //? Update
  //?-------------------------------------------------------------------------//

  //? 학교 발신번호 활성화/비활성화
  async updateIsActive(
    schoolId: number,
    phoneId: number,
  ): Promise<UpdateResult> {
    const phone = await this.phoneRepository.findOne({
      where: { id: phoneId, school: { id: schoolId } },
    });

    if (!phone) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL);
    }

    return await this.phoneRepository
      .createQueryBuilder()
      .update(Phone)
      .set({
        isActive: () => `CASE WHEN id = :phoneId THEN TRUE ELSE FALSE END`,
      })
      .where('schoolId = :schoolId', { schoolId: schoolId })
      .setParameter('phoneId', phoneId)
      .execute();
  }
}
