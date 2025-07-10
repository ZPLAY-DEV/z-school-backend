import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Shortlink } from '../entities/shortlink.entity';

//? ---------------------------------------------------------------------- ?//
//? List All Shortlinks
//? ---------------------------------------------------------------------- ?//

export const ListShortlinksDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 Shortlinks List Retrieval',
      description: `
### 📝 Feature Description
Retrieve a comprehensive list of all shortlinks in the system. Shortlinks are generated for newsletter distribution and provide secure, trackable access to content for parents and other users.

### 🔄 Business Logic
- Fetches all active shortlinks from the database
- Includes basic shortlink information without relations by default
- Returns shortlinks in creation order (newest first typically)
- Does not include soft-deleted shortlinks
- Provides overview of all generated shortlinks for administrative purposes

### 🎯 Shortlink System Overview
- **Purpose**: Secure, trackable links for newsletter and content access
- **Generation**: Automatic creation when newsletters are sent to parents
- **Tracking**: Monitor if links have been accessed (isRead flag)
- **Security**: Uses nanoid for non-guessable, unique identifiers
- **Routing**: Contains page and args information for proper navigation

### 💡 Usage Scenarios
- **Administrative Dashboard**: View all generated shortlinks
- **Analytics and Reporting**: Track link generation and usage
- **System Monitoring**: Monitor shortlink creation patterns
- **Content Management**: Oversee newsletter distribution links
- **Troubleshooting**: Debug link-related issues

### 📊 Data Structure
Each shortlink contains:
- **Identification**: Unique ID and nanoid for routing
- **Associations**: Links to parent and newsletter
- **Routing**: Page destination and additional arguments
- **Metadata**: Creation time, read status, optional notes
- **Tracking**: Read status for engagement analytics

### 📝 Detailed Response Example
\`\`\`json
[
  {
    "id": 1,
    "parentId": 123,
    "newsletterId": 456,
    "nanoid": "V1StGXR8_Z5jdHi6B-myT",
    "page": "newsletters",
    "args": "id=456&parentId=123",
    "note": "Monthly newsletter for parent",
    "isRead": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T15:30:00.000Z"
  },
  {
    "id": 2,
    "parentId": 124,
    "newsletterId": 456,
    "nanoid": "Dg2W4sF9j_3kLm7qN-opR",
    "page": "newsletters",
    "args": "id=456&parentId=124",
    "note": "Monthly newsletter for parent",
    "isRead": false,
    "createdAt": "2024-01-01T10:01:00.000Z",
    "updatedAt": "2024-01-01T10:01:00.000Z"
  }
]
\`\`\`

### 🔍 Analytics Insights
- **Read Rates**: Track how many links have been accessed
- **Distribution Patterns**: Monitor shortlink generation frequency
- **User Engagement**: Identify most and least engaged parents
- **Content Performance**: Analyze which newsletters get more clicks

### ⚠️ Error Conditions
- **500 Internal Server Error**: Database connection issues, server problems
- **503 Service Unavailable**: System maintenance or temporary unavailability
      `,
    }),
    ApiOkResponseTemplate({
      description: '✅ Shortlinks list retrieved successfully',
      type: Shortlink,
      isArray: true,
    }),
    ApiStatuses(
      StatusCodes.INTERNAL_SERVER_ERROR,
      StatusCodes.SERVICE_UNAVAILABLE,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Shortlink By ID with Relations
//? ---------------------------------------------------------------------- ?//

export const FindShortlinkByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 Shortlink Detailed Information Retrieval',
      description: `
### 📝 Feature Description
Retrieve comprehensive information for a specific shortlink including its associated parent and newsletter data. This endpoint provides complete context about the shortlink's purpose and target audience.

### 🔄 Business Logic
- Fetches shortlink by unique ID with full relationship data
- Includes associated parent information for context
- Loads related newsletter content and metadata
- Provides complete picture of the shortlink's usage and purpose
- Returns 404 if shortlink doesn't exist or has been soft-deleted

### 🔗 Relationship Loading
- **Parent Relation**: Complete parent user information
  - Parent account details and contact information
  - Student associations and family context
  - Account status and preferences
- **Newsletter Relation**: Full newsletter content and metadata
  - Newsletter title, content, and distribution details
  - Publication date and target audience
  - Delivery status and engagement metrics

### 💡 Usage Scenarios
- **Content Administration**: Review specific shortlink context
- **Parent Support**: Troubleshoot link access issues
- **Analytics Deep Dive**: Analyze individual link performance
- **Content Verification**: Confirm newsletter-parent associations
- **Audit Trail**: Track specific shortlink usage and history

### 🔐 Security Considerations
- Nanoid provides cryptographically secure, non-guessable identifiers
- No sensitive parent information exposed unnecessarily
- Proper authorization should be implemented at controller level
- Tracking of access attempts for security monitoring

### 🎯 Practical Applications
- **Customer Service**: Help parents with link access problems
- **Content Management**: Verify newsletter delivery to specific parents
- **System Administration**: Debug routing and navigation issues
- **Reporting**: Generate detailed engagement reports per user

### 📝 Detailed Response Example
\`\`\`json
{
  "id": 1,
  "parentId": 123,
  "newsletterId": 456,
  "nanoid": "V1StGXR8_Z5jdHi6B-myT",
  "page": "newsletters",
  "args": "id=456&parentId=123&studentId=789",
  "note": "Special announcement newsletter",
  "isRead": true,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T15:30:00.000Z",
  "parent": {
    "id": 123,
    "username": "parent.kim",
    "phone": "01012345678",
    "name": "김학부모",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "newsletter": {
    "id": 456,
    "title": "January School Updates",
    "content": "Important announcements for the new semester...",
    "publishedAt": "2024-01-01T09:00:00.000Z",
    "schoolId": 1,
    "authorId": 10,
    "isPublished": true,
    "createdAt": "2024-01-01T08:00:00.000Z",
    "updatedAt": "2024-01-01T09:00:00.000Z"
  }
}
\`\`\`

### 📊 Data Context
- **Complete Traceability**: Full chain from newsletter to parent to student
- **Engagement History**: When and how the link was accessed
- **Content Validation**: Verify correct newsletter-parent pairing
- **System Integrity**: Ensure proper relationship data consistency

### ⚠️ Error Conditions
- **404 Not Found**: Shortlink with specified ID does not exist or is deleted
- **400 Bad Request**: Invalid ID format provided
- **500 Internal Server Error**: Database or relationship loading issues
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: 'Unique shortlink identifier',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description:
        '✅ Shortlink details with parent and newsletter information',
      type: Shortlink,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Shortlink
//? ---------------------------------------------------------------------- ?//

export const SoftDeleteShortlinkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ Shortlink Soft Deletion',
      description: `
### 📝 Feature Description
Safely remove a shortlink from active use while preserving data integrity for historical and audit purposes. This soft deletion approach maintains referential integrity and allows for data recovery if needed.

### 🔄 Business Logic
- Marks the shortlink as deleted without physical removal
- Sets deletedAt timestamp for audit trail
- Prevents future access through the nanoid URL
- Maintains database relationships for historical analysis
- Preserves data for compliance and auditing requirements
- Does not affect related parent or newsletter records

### 🛡️ Soft Deletion Benefits
- **Data Preservation**: Historical records remain intact
- **Audit Compliance**: Complete deletion trail for regulatory requirements
- **Relationship Integrity**: No cascading deletions affecting other entities
- **Recovery Capability**: Potential to restore if deletion was accidental
- **Analytics Continuity**: Historical engagement data preserved

### 💡 Usage Scenarios
- **Content Retirement**: Remove outdated or irrelevant newsletter links
- **Security Response**: Disable compromised or suspicious shortlinks
- **Policy Compliance**: Remove links that violate content policies
- **System Maintenance**: Clean up test or duplicate shortlinks
- **Parent Request**: Honor deletion requests for privacy reasons

### 🔐 Security Implications
- **Immediate Deactivation**: Link becomes inaccessible immediately
- **No Data Loss**: Original data preserved for investigation if needed
- **Audit Trail**: Clear record of when and why deletion occurred
- **Access Prevention**: Nanoid routing disabled for deleted links

### 📊 Administrative Impact
- **Reporting**: Deleted shortlinks excluded from active analytics
- **System Performance**: Reduces active link count for better performance
- **Data Management**: Organized approach to link lifecycle management
- **Compliance**: Meets data retention and deletion policy requirements

### 🔄 Post-Deletion Behavior
- **Link Access**: Returns 404 or appropriate error for nanoid access
- **Database Queries**: Excluded from normal shortlink lists
- **Relationships**: Parent and newsletter remain unaffected
- **Analytics**: Marked as deleted in engagement reports

### ✅ Success Response
- **Status**: 200 OK
- **Body**: Empty (void response)
- **Action**: Shortlink successfully marked as deleted
- **Effect**: Immediate deactivation and audit trail creation

### 📝 Operation Details
- **Atomic Operation**: Deletion happens in a single transaction
- **Timestamp Recording**: Exact deletion time preserved
- **Relationship Safety**: No impact on parent or newsletter entities
- **Reversibility**: Potential for restoration by clearing deletedAt field

### ⚠️ Error Conditions
- **404 Not Found**: Shortlink with specified ID does not exist
- **400 Bad Request**: Invalid ID format or already deleted shortlink
- **403 Forbidden**: Insufficient permissions for deletion operation
- **500 Internal Server Error**: Database transaction failure or system error

### 🚨 Important Considerations
- **Irreversible via API**: No standard restore endpoint (requires direct database access)
- **Cascading Effects**: Consider impact on user bookmarks or saved links
- **Notification**: May want to inform relevant parties about link deactivation
- **Monitoring**: Track deletion patterns for system health analysis
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: 'Unique shortlink identifier to be deleted',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ Shortlink successfully marked as deleted',
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.FORBIDDEN,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};
