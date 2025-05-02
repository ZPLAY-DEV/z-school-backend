import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
}
