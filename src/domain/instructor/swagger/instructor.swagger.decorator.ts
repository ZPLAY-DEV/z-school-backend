import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { UpdateInstructorDto } from '../dto/update-instructor.dto';

const PAGINATED_INSTRUCTOR_CONFIG: PaginateConfig<Instructor> = {
  sortableColumns: ['id'],
  defaultLimit: 20,
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    userId: [FilterOperator.EQ],
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    phone: [FilterOperator.EQ, FilterOperator.ILIKE],
    termsAgreedAt: [FilterOperator.NULL],
  },
  relations: {
    sams: {
      school: true,
    },
  },
};

//? ---------------------------------------------------------------------- ?//
//? Find All Instructors (Paginated)
//? ---------------------------------------------------------------------- ?//

export const FindAllInstructorDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥 Instructors List Retrieval (Paginated)',
      description: `
### 📝 Feature Description
Retrieve a comprehensive, paginated list of all instructors in the system with advanced filtering and sorting capabilities. This endpoint provides detailed instructor information along with their school assignments and user account associations.

### 🔄 Business Logic
- Fetches instructors with pagination for optimal performance
- Default sorting by ID in descending order (newest first)
- Includes related Sam (School-Assignment-Manager) data for each instructor
- Supports advanced filtering by multiple criteria
- Automatically includes school information for each instructor's assignments
- Excludes soft-deleted instructors from results

### 📊 Pagination & Sorting
- **Default Limit**: 20 instructors per page
- **Default Sort**: ID descending (newest instructors first)
- **Sortable Fields**: ID only (maintains consistent ordering)
- **Performance**: Optimized queries with relation loading

### 🔍 Advanced Filtering Options
- **userId**: Filter by user account association
  - \`null\`: Instructors without user accounts (not registered)
  - \`number\`: Instructors linked to specific user accounts
- **name**: Search by instructor name
  - Exact match or partial search (case-insensitive)
  - Supports Korean and English names
- **phone**: Search by phone number
  - Exact match or partial search
  - Useful for contact verification
- **termsAgreedAt**: Filter by terms agreement status
  - \`null\`: Instructors who haven't agreed to terms
  - Date filters for compliance tracking

### 💡 Usage Scenarios
- **Administrative Dashboard**: View and manage all instructors
- **Registration Tracking**: Identify instructors without user accounts
- **Contact Management**: Search instructors by phone or name
- **Compliance Monitoring**: Track terms agreement status
- **School Assignment Review**: See instructor-school relationships
- **Onboarding Workflow**: Find instructors needing account setup

### 🏫 School Assignment Context
Each instructor includes Sam (School Assignment Manager) data:
- **Multiple School Support**: Instructors can work at multiple schools
- **Role Information**: Different roles per school assignment
- **School Details**: Full school information for each assignment
- **Assignment Status**: Active/inactive status per school

### 📝 Detailed Response Example
\`\`\`json
{
  "data": [
    {
      "id": 123,
      "userId": 456,
      "name": "김영희",
      "phone": "01012345678",
      "note": "10년 경력 수학 전문 강사",
      "termsAgreedAt": "2024-01-15T09:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T09:30:00.000Z",
      "user": {
        "id": 456,
        "username": "instructor.kim",
        "role": "INSTRUCTOR",
        "isActive": true
      },
      "sams": [
        {
          "id": 789,
          "instructorId": 123,
          "schoolId": 1,
          "role": "LEAD_INSTRUCTOR",
          "isActive": true,
          "createdAt": "2024-01-01T00:00:00.000Z",
          "school": {
            "id": 1,
            "name": "서울초등학교",
            "address": "서울시 강남구...",
            "phone": "0212345678"
          }
        }
      ]
    },
    {
      "id": 124,
      "userId": null,
      "name": "박철수",
      "phone": "01087654321",
      "note": "신입 강사, 영어 전공",
      "termsAgreedAt": null,
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z",
      "user": null,
      "sams": [
        {
          "id": 790,
          "instructorId": 124,
          "schoolId": 2,
          "role": "ASSISTANT_INSTRUCTOR",
          "isActive": true,
          "createdAt": "2024-01-02T00:00:00.000Z",
          "school": {
            "id": 2,
            "name": "부산중학교",
            "address": "부산시 해운대구...",
            "phone": "0515551234"
          }
        }
      ]
    }
  ],
  "meta": {
    "itemsPerPage": 20,
    "totalItems": 45,
    "currentPage": 1,
    "totalPages": 3,
    "sortBy": [["id", "DESC"]],
    "searchBy": [],
    "search": "",
    "filter": {}
  },
  "links": {
    "first": "/instructors/paginated?limit=20&page=1",
    "previous": null,
    "current": "/instructors/paginated?limit=20&page=1", 
    "next": "/instructors/paginated?limit=20&page=2",
    "last": "/instructors/paginated?limit=20&page=3"
  }
}
\`\`\`

### 📊 Analytics Insights
- **Registration Rate**: Track how many instructors have user accounts
- **Terms Compliance**: Monitor agreement status for legal compliance
- **Geographic Distribution**: Analyze instructor distribution across schools
- **Workload Analysis**: Identify instructors working at multiple schools

### 🔧 Query Examples
\`\`\`
# Get instructors without user accounts
GET /instructors/paginated?filter.userId=$null

# Search by name (partial match)
GET /instructors/paginated?filter.name=$ilike:김

# Find instructors by phone number
GET /instructors/paginated?filter.phone=$eq:01012345678

# Get instructors who haven't agreed to terms
GET /instructors/paginated?filter.termsAgreedAt=$null
\`\`\`

### ⚠️ Error Conditions
- **400 Bad Request**: Invalid pagination parameters, malformed filters
- **422 Unprocessable Entity**: Invalid filter operators or field names
- **500 Internal Server Error**: Database connection issues, query failures
      `,
    }),
    ApiPaginationQuery(PAGINATED_INSTRUCTOR_CONFIG),
    ApiOkPaginatedResponse(Instructor, PAGINATED_INSTRUCTOR_CONFIG),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );

//? ---------------------------------------------------------------------- ?//
//? Find Instructor By ID with Relations
//? ---------------------------------------------------------------------- ?//

export const FindInstructorByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 Instructor Detailed Information Retrieval',
      description: `
### 📝 Feature Description
Retrieve comprehensive information for a specific instructor including their user account details and complete school assignment history. This endpoint provides the full context needed for instructor management and administrative operations.

### 🔄 Business Logic
- Fetches instructor by unique ID with complete relationship data
- Includes associated user account information (if registered)
- Loads all Sam (School Assignment Manager) records for the instructor
- Provides school details for each assignment
- Returns 404 if instructor doesn't exist or has been soft-deleted
- Optimized query loading for performance

### 🔗 Comprehensive Data Loading
- **User Relation**: Complete user account information
  - Login credentials and account status
  - Role permissions and access levels
  - Registration and activity timestamps
- **Sam Relations**: All school assignment records
  - Role and responsibility at each school
  - Assignment status and duration
  - School context and contact information

### 💡 Usage Scenarios
- **Instructor Profile Management**: Display complete instructor information
- **Administrative Review**: Comprehensive instructor evaluation
- **Contact Verification**: Confirm instructor details and availability
- **School Assignment Planning**: Review current and past assignments
- **Account Troubleshooting**: Debug user account and permission issues
- **Compliance Auditing**: Verify instructor credentials and agreements

### 🏫 Multi-School Context
Instructors can work at multiple schools simultaneously:
- **Independent Assignments**: Separate roles and responsibilities per school
- **Role Flexibility**: Different roles (lead, assistant, substitute) per assignment
- **Status Management**: Individual active/inactive status per school
- **Performance Tracking**: School-specific performance and feedback

### 🔐 Data Security & Privacy
- Sensitive information appropriately masked based on access level
- User account details only shown to authorized personnel
- Phone numbers and personal details protected
- Audit trail maintained for data access

### 📝 Detailed Response Example
\`\`\`json
{
  "id": 123,
  "userId": 456,
  "name": "김영희",
  "phone": "01012345678",
  "note": "10년 경력 수학 전문 강사, 중등 수학 자격증 보유",
  "termsAgreedAt": "2024-01-15T09:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T09:30:00.000Z",
  "user": {
    "id": 456,
    "username": "instructor.kim",
    "role": "INSTRUCTOR",
    "phone": "01012345678",
    "isActive": true,
    "lastLoginAt": "2024-01-20T08:00:00.000Z",
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-20T08:00:00.000Z"
  },
  "sams": [
    {
      "id": 789,
      "instructorId": 123,
      "schoolId": 1,
      "role": "LEAD_INSTRUCTOR",
      "isActive": true,
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "school": {
        "id": 1,
        "name": "서울초등학교",
        "address": "서울시 강남구 테헤란로 123",
        "phone": "0212345678",
        "email": "info@seoul-elementary.edu",
        "principalName": "이교장",
        "studentCount": 850,
        "isActive": true,
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    },
    {
      "id": 790,
      "instructorId": 123,
      "schoolId": 2,
      "role": "PART_TIME_INSTRUCTOR",
      "isActive": false,
      "startDate": "2023-09-01T00:00:00.000Z",
      "endDate": "2023-12-31T23:59:59.000Z",
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-12-31T23:59:59.000Z",
      "school": {
        "id": 2,
        "name": "부산중학교",
        "address": "부산시 해운대구 센텀로 456",
        "phone": "0515551234",
        "email": "contact@busan-middle.edu",
        "principalName": "박교장",
        "studentCount": 720,
        "isActive": true,
        "createdAt": "2020-03-01T00:00:00.000Z"
      }
    }
  ]
}
\`\`\`

### 📊 Data Context Analysis
- **Employment History**: Complete timeline of school assignments
- **Role Progression**: Track instructor career development
- **Multi-School Coordination**: Manage scheduling across institutions
- **Performance Correlation**: Link instructor success to school assignments

### 🎯 Administrative Applications
- **Staff Planning**: Resource allocation across schools
- **Performance Review**: Comprehensive instructor evaluation
- **Contract Management**: Track employment terms and renewals
- **Credential Verification**: Confirm qualifications and certifications

### ⚠️ Error Conditions
- **404 Not Found**: Instructor with specified ID does not exist or is deleted
- **400 Bad Request**: Invalid ID format (non-numeric or negative)
- **403 Forbidden**: Insufficient permissions to view instructor details
- **500 Internal Server Error**: Database relationship loading failure
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: 'Unique instructor identifier',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description:
        '✅ Instructor details with user account and school assignments',
      type: Instructor,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.FORBIDDEN,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );

//? ---------------------------------------------------------------------- ?//
//? Update Instructor Information
//? ---------------------------------------------------------------------- ?//

export const UpdateInstructorDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ Instructor Information Update',
      description: `
### 📝 Feature Description
Update specific fields of an existing instructor's information with comprehensive validation and conflict resolution. This endpoint supports partial updates while maintaining data integrity and business rules.

### 🔄 Business Logic
- Validates instructor existence before attempting updates
- Performs partial updates (only provided fields are modified)
- Enforces business rules and data constraints
- Maintains audit trail with automatic timestamp updates
- Handles unique constraint validation (phone numbers)
- Preserves system-managed fields (userId, creation timestamps)

### 🔐 Field Validation Rules
- **Name**: 1-16 characters, Korean/English/spaces only
- **Phone**: 10-11 digits, must be unique across system
- **Note**: Maximum 255 characters, supports special characters
- **Terms Agreement**: Valid ISO 8601 timestamp format
- **User ID**: System-managed, cannot be modified through this endpoint

### 💡 Update Scenarios
- **Contact Information**: Update phone number for communication
- **Personal Details**: Correct name spelling or update display name
- **Administrative Notes**: Add qualifications, experience, or special instructions
- **Compliance Tracking**: Record terms agreement or policy acknowledgments
- **Data Corrections**: Fix typos or update outdated information

### 🔧 Partial Update Support
Only provided fields are updated; others remain unchanged:
- **Single Field**: Update just name, phone, or note
- **Multiple Fields**: Update any combination of editable fields
- **Conditional Updates**: Update based on current state or business rules
- **Batch Processing**: Efficient updates for administrative operations

### 📊 Business Impact
- **Contact Reliability**: Maintain current communication channels
- **Compliance Management**: Track agreement and policy compliance
- **Data Quality**: Improve instructor information accuracy
- **Operational Efficiency**: Quick corrections without full profile recreation

### 📝 Request Examples
\`\`\`json
// Update only name
{
  "name": "김영희선생님"
}

// Update phone number
{
  "phone": "01087654321"
}

// Update note with qualifications
{
  "note": "수학 전문 강사, 교원자격증 보유, 10년 경력"
}

// Record terms agreement
{
  "termsAgreedAt": "2024-01-20T10:30:00.000Z"
}

// Multiple field update
{
  "name": "김영희",
  "phone": "01098765432",
  "note": "연락 시간: 평일 9-18시, 주말 불가",
  "termsAgreedAt": "2024-01-20T10:30:00.000Z"
}
\`\`\`

### 📝 Detailed Response Example
\`\`\`json
{
  "id": 123,
  "userId": 456,
  "name": "김영희선생님",
  "phone": "01087654321",
  "note": "수학 전문 강사, 교원자격증 보유, 10년 경력, 연락시간: 평일 9-18시",
  "termsAgreedAt": "2024-01-20T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-20T14:25:30.000Z",
  "user": {
    "id": 456,
    "username": "instructor.kim",
    "role": "INSTRUCTOR",
    "isActive": true,
    "lastLoginAt": "2024-01-20T08:00:00.000Z"
  },
  "sams": [
    {
      "id": 789,
      "instructorId": 123,
      "schoolId": 1,
      "role": "LEAD_INSTRUCTOR",
      "isActive": true,
      "school": {
        "id": 1,
        "name": "서울초등학교"
      }
    }
  ]
}
\`\`\`

### 🚨 Validation & Constraints
- **Phone Uniqueness**: System-wide unique phone number requirement
- **Name Format**: Korean characters, English letters, and spaces only
- **Length Limits**: Appropriate field length restrictions
- **Data Types**: Proper type validation for all fields
- **Business Rules**: Custom validation based on business requirements

### 🔄 Update Process Flow
1. **Validation**: Check input data format and business rules
2. **Existence Check**: Verify instructor exists and is active
3. **Conflict Resolution**: Handle unique constraint violations
4. **Data Update**: Apply changes with transaction safety
5. **Audit Trail**: Record update history for compliance
6. **Response**: Return updated instructor with relationships

### ⚠️ Error Conditions
- **404 Not Found**: Instructor with specified ID does not exist
- **400 Bad Request**: Invalid input data format or validation failure
- **409 Conflict**: Phone number already exists for another instructor
- **422 Unprocessable Entity**: Business rule violation or constraint failure
- **500 Internal Server Error**: Database transaction failure or system error
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: 'Unique identifier of instructor to update',
      example: 123,
    }),
    ApiBody({
      type: UpdateInstructorDto,
      description: 'Instructor information fields to update (partial)',
    }),
    ApiOkResponseTemplate({
      description: '✅ Instructor information updated successfully',
      type: Instructor,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.CONFLICT,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Instructor
//? ---------------------------------------------------------------------- ?//

export const SoftDeleteSchoolInstructorDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ Instructor Soft Deletion with Audit Trail',
      description: `
### 📝 Feature Description
Safely remove an instructor from active use while preserving all historical data and maintaining referential integrity. This soft deletion approach ensures compliance with data retention policies and enables potential data recovery.

### 🔄 Business Logic
- Marks instructor as deleted without physical data removal
- Sets deletedAt timestamp for audit and compliance purposes
- Preserves all related data (Sam assignments, user accounts, activity history)
- Records optional deletion reason for administrative tracking
- Maintains data integrity for reporting and analytics
- Excludes deleted instructors from normal operational queries

### 🛡️ Data Preservation Strategy
- **Instructor Profile**: Archived with deletion timestamp and reason
- **School Assignments**: Sam records remain intact for historical analysis
- **User Account**: Remains active unless separately deactivated
- **Activity History**: All teaching history and performance data preserved
- **Compliance Data**: Terms agreements and certifications retained

### 💼 Administrative Impact
- **Immediate Effect**: Instructor excluded from active lists and assignments
- **School Operations**: No disruption to historical records or reporting
- **User Access**: Account remains functional unless explicitly disabled
- **Data Analytics**: Historical performance data remains available
- **Audit Compliance**: Complete trail of employment and deletion history

### 🔐 Security & Privacy Considerations
- **Data Retention**: Complies with employment law data retention requirements
- **Privacy Rights**: Supports GDPR and similar privacy regulation compliance
- **Access Control**: Deleted instructor data accessible only to authorized personnel
- **Audit Trail**: Complete record of who deleted when and why

### 💡 Deletion Scenarios
- **Employment Termination**: Contract completion or resignation
- **Administrative Cleanup**: Remove duplicate or test accounts
- **Compliance Response**: Privacy law data subject requests
- **System Maintenance**: Routine data lifecycle management
- **Role Transition**: Moving instructor to different role or system

### 🔄 Post-Deletion Behavior
- **List Queries**: Excluded from all standard instructor listings
- **Direct Access**: Returns 404 for direct ID-based queries
- **Related Data**: Sam assignments and user accounts unaffected
- **Search Results**: Removed from name and phone search results
- **Analytics**: Marked as deleted in comprehensive reports

### 📊 Operational Continuity
- **School Assignments**: Historical Sam data preserved for institutional memory
- **Student Records**: Teaching history remains linked to student performance
- **Financial Records**: Payroll and compensation history maintained
- **Performance Data**: Teaching effectiveness metrics preserved

### 📝 Deletion Request Examples
\`\`\`json
// With detailed reason
{
  "note": "계약 만료로 인한 정상 퇴사 - 2024.01.31"
}

// Brief reason
{
  "note": "중복 계정 정리"
}

// Without specific reason (empty body)
{
}
\`\`\`

### ✅ Success Response
- **Status**: 200 OK
- **Body**: Empty (void response)
- **Effect**: Instructor immediately marked as deleted
- **Audit**: Deletion event logged with timestamp and optional reason

### 📋 Administrative Procedures
- **Notice Period**: Consider providing advance notice to affected schools
- **Data Export**: Option to export instructor data before deletion
- **Handover Process**: Transfer ongoing responsibilities to other instructors
- **System Updates**: Update schedules and assignments accordingly

### 🚨 Important Considerations
- **Irreversibility**: Standard API provides no restoration endpoint
- **Related Impact**: Consider effect on active teaching assignments
- **Communication**: Inform relevant stakeholders of instructor unavailability
- **Transition Planning**: Ensure smooth handover of responsibilities

### ⚠️ Error Conditions
- **404 Not Found**: Instructor with specified ID does not exist or already deleted
- **400 Bad Request**: Invalid deletion reason format or request structure
- **403 Forbidden**: Insufficient permissions for deletion operation
- **409 Conflict**: Cannot delete instructor with active critical assignments
- **500 Internal Server Error**: Database transaction failure or system error

### 📈 Recovery & Restoration
While not available through standard API:
- **Database Restoration**: Technical recovery possible through direct database access
- **Data Migration**: Historical data can be migrated to new instructor profiles
- **Audit Review**: Complete deletion history available for administrative review
- **Compliance Reporting**: Deletion events included in regulatory compliance reports
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: 'Unique identifier of instructor to delete',
      example: 123,
    }),
    ApiBody({
      description: 'Optional deletion reason and context',
      schema: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            description: 'Reason for deletion (administrative record)',
            example: '계약 만료로 인한 정상 퇴사 - 담당자: 김관리자',
            maxLength: 255,
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '✅ Instructor successfully marked as deleted',
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.FORBIDDEN,
      StatusCodes.CONFLICT,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
