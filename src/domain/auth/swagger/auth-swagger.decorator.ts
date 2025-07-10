import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { AuthUserDto } from 'src/domain/auth/dto/auth-user.dto';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';

//? ---------------------------------------------------------------------- ?//
//? User Registration (Parents/Instructors)
//? ---------------------------------------------------------------------- ?//

export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 User Registration for Parents/Instructors',
      description: `
### 📝 Feature Description
Register a new user account for parents or instructors using the mobile application. This endpoint handles user creation with automatic login upon successful registration.

### 🔄 Business Logic
- Creates a new user account with parent or instructor role
- Validates unique phone number (no duplicate registrations with same role)
- Automatically logs in the user after successful registration
- Sets secure HTTP-only cookies for both access and refresh tokens
- If username is not provided, uses phone number as default username
- Passwords are hashed using secure encryption before storage
- Phone numbers must be exactly 11 digits in Korean format

### 🔐 Security Features
- HTTP-only cookies prevent XSS attacks
- Secure cookie settings in production environment
- SameSite cookie policy for CSRF protection
- Token expiration: Access token (1 hour), Refresh token (30 days)
- Password hashing with salt for secure storage

### 💡 Usage Scenarios
- New parent registration for student management
- Instructor account creation for teaching services
- Mobile app user onboarding process
- First-time user authentication setup

### 📱 Cookie Management
- **Access Token**: Stored in HTTP-only cookie, expires in 1 hour
- **Refresh Token**: Stored in HTTP-only cookie, expires in 30 days
- Both tokens are also returned in response body for client-side access
- Automatic cookie clearing on logout

### 📝 Detailed Response Example
\`\`\`json
{
  "user": {
    "id": 123,
    "username": "01012345678",
    "role": "PARENT",
    "phone": "01012345678",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_123_P_randomString"
}
\`\`\`

### ⚠️ Error Conditions
- **400 Bad Request**: Invalid phone format, missing required fields, duplicate user
- **422 Validation Error**: Password too weak, invalid role specification
      `,
    }),
    ApiBody({
      type: UserCredentialsDtoWithPhone,
      description: 'User registration data with phone number',
    }),
    ApiCreatedResponseTemplate({
      description: '✅ User registration successful with automatic login',
      type: AuthUserDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Manager Registration
//? ---------------------------------------------------------------------- ?//

export const RegisterManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍💼 Manager Account Registration',
      description: `
### 📝 Feature Description
Create a new manager account specifically for web-based administrative access. This endpoint is designed for internal staff registration with elevated permissions.

### 🔄 Business Logic
- Creates manager account with administrative privileges
- Requires username instead of phone number (web-based interface)
- Validates unique username within manager role scope
- Automatically authenticates user upon successful creation
- Sets secure authentication cookies for web session management
- Manager accounts have different permissions than parent/instructor accounts

### 🎯 Manager Role Privileges
- Access to administrative dashboard
- Student and instructor management capabilities
- Financial reporting and analytics
- System configuration and settings
- Bulk operations and data exports

### 💡 Usage Scenarios
- New administrator onboarding
- Staff account provisioning
- Administrative access setup
- Internal user management

### 🔐 Security Considerations
- Username-based authentication for web interface
- Same security standards as user registration
- Role-based access control implementation
- Administrative session management

### 📝 Detailed Response Example
\`\`\`json
{
  "user": {
    "id": 456,
    "username": "manager.kim",
    "role": "MANAGER", 
    "phone": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_456_M_randomString"
}
\`\`\`

### ⚠️ Error Conditions
- **400 Bad Request**: Invalid username format, missing credentials
- **409 Conflict**: Username already exists for manager role
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
      description: 'Manager account credentials (username, password, role)',
    }),
    ApiCreatedResponseTemplate({
      description: '✅ Manager account created and authenticated successfully',
      type: AuthUserDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Password Reset
//? ---------------------------------------------------------------------- ?//

export const ResetPasswordDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔑 Password Reset',
      description: `
### 📝 Feature Description
Reset user password for parent and instructor accounts. This endpoint allows users to update their password when they have forgotten it or need to change it for security reasons.

### 🔄 Business Logic
- Validates user identity through phone number or username
- Updates password with new hashed value
- Invalidates all existing refresh tokens for security
- Requires valid verification process (OTP, email verification, etc.)
- Only available for PARENT and INSTRUCTOR roles
- Manager password resets require different administrative process

### 🔐 Security Process
- Password is hashed using HashPasswordPipe before storage
- All existing sessions are invalidated upon password change
- New login required after password reset
- Verification token validation before password update
- Rate limiting to prevent brute force attacks

### 💡 Usage Scenarios
- Forgotten password recovery
- Security-motivated password changes
- Account recovery after compromise
- Regular password rotation policies

### 📱 Post-Reset Actions
- User must log in again with new password
- All devices are automatically logged out
- New authentication tokens must be obtained
- Optional email/SMS notification of password change

### 📝 Request Example
\`\`\`json
{
  "phone": "01012345678",
  "newPassword": "newSecurePassword123!",
  "verificationCode": "123456"
}
\`\`\`

### ✅ Success Response
- **Status**: 200 OK
- **Body**: Empty (void response)
- **Action**: Password successfully updated

### ⚠️ Error Conditions
- **404 Not Found**: User with provided phone/username does not exist
- **400 Bad Request**: Invalid verification code, weak password
- **429 Too Many Requests**: Rate limit exceeded for password reset attempts
      `,
    }),
    ApiBody({
      type: ResetPasswordDto,
      description: 'Password reset request with verification',
    }),
    ApiOkResponseTemplate({
      description: '✅ Password reset completed successfully',
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.TOO_MANY_REQUESTS,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? User Login
//? ---------------------------------------------------------------------- ?//

export const LoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔐 User Authentication Login',
      description: `
### 📝 Feature Description
Authenticate users with username/phone and password credentials. This endpoint handles login for all user roles (parents, instructors, managers) and establishes secure authentication sessions.

### 🔄 Business Logic
- Validates user credentials against stored hash
- Generates new access and refresh token pair
- Sets secure HTTP-only cookies for web clients
- Returns tokens in response for mobile/API clients
- Updates last login timestamp
- Handles multiple device sessions per user

### 🔐 Authentication Flow
1. **Credential Validation**: Username/phone and password verification
2. **Token Generation**: Create JWT access token and refresh token
3. **Session Creation**: Store session information in Redis/database
4. **Cookie Setting**: Set HTTP-only cookies for browser clients
5. **Response**: Return user data and tokens

### 💡 Multi-Platform Support
- **Web Browsers**: Uses HTTP-only cookies automatically
- **Mobile Apps**: Uses tokens from response body
- **API Clients**: Can use either cookies or Authorization header
- **Cross-Domain**: CORS-compliant for different client origins

### 🕐 Token Lifecycle
- **Access Token**: 1 hour expiration, contains user claims
- **Refresh Token**: 30 days expiration, used for token renewal
- **Session Storage**: Redis for fast lookup and invalidation
- **Automatic Cleanup**: Expired tokens removed periodically

### 📝 Detailed Response Example
\`\`\`json
{
  "user": {
    "id": 789,
    "username": "parent123",
    "role": "PARENT",
    "phone": "01012345678",
    "isActive": true,
    "lastLoginAt": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc4OSwicm9sZSI6IlBBUkVOVCIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ...",
  "refreshToken": "refresh_789_P_abcd1234efgh5678ijkl9012"
}
\`\`\`

### ⚠️ Error Conditions
- **404 Not Found**: User does not exist
- **401 Unauthorized**: Invalid password, account disabled
- **423 Locked**: Account temporarily locked due to failed attempts
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
      description: 'User login credentials (username/phone and password)',
    }),
    ApiOkResponseTemplate({
      description: '✅ User authentication successful',
      type: AuthUserDto,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.LOCKED,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Nanoid Login
//? ---------------------------------------------------------------------- ?//

export const LoginWithNanoidDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🆔 Nanoid-based Authentication',
      description: `
### 📝 Feature Description
Authenticate users using a unique Nanoid token instead of traditional username/password. This method provides passwordless authentication for specific use cases like QR code login or temporary access.

### 🔄 Business Logic
- Validates the provided Nanoid against stored user records
- Nanoid serves as a temporary, unique identifier for authentication
- Generates standard access and refresh tokens upon successful validation
- Same session management as regular login
- Nanoid may have expiration time for security

### 🎯 Use Cases
- **QR Code Authentication**: Mobile app login via QR scan
- **Temporary Access**: Guest or limited-time user access
- **Device Pairing**: Connect new devices without password entry
- **Administrative Tools**: Internal system access with generated tokens
- **Magic Link Login**: Email-based passwordless authentication

### 🔐 Security Considerations
- Nanoids are cryptographically secure random strings
- Limited usage count (single-use or time-limited)
- Cannot be guessed or brute-forced
- Automatic expiration after use or timeout
- Audit logging for Nanoid-based logins

### 📱 Integration Examples
- Mobile app generates QR code with Nanoid
- User scans QR code to authenticate on web
- Temporary worker accounts with Nanoid access
- Password recovery alternative method

### 📝 Request Parameters
\`\`\`
GET /auth/login/nanoid/abc123def456ghi789
\`\`\`

### 📝 Detailed Response Example
\`\`\`json
{
  "user": {
    "id": 101,
    "username": "temp.user",
    "role": "INSTRUCTOR",
    "phone": "01098765432",
    "isActive": true,
    "lastLoginAt": "2024-01-01T15:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T15:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_101_I_nanoid_xyz789"
}
\`\`\`

### ⚠️ Error Conditions
- **404 Not Found**: Invalid or expired Nanoid
- **401 Unauthorized**: Nanoid already used or account disabled
- **410 Gone**: Nanoid has expired beyond recovery
      `,
    }),
    ApiParam({
      name: 'id',
      description: 'Unique Nanoid token for authentication',
      type: String,
      example: 'abc123def456ghi789xyz',
    }),
    ApiOkResponseTemplate({
      description: '✅ Nanoid authentication successful',
      type: AuthUserDto,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.GONE,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Token Refresh
//? ---------------------------------------------------------------------- ?//

export const RefreshDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 Access Token Renewal',
      description: `
### 📝 Feature Description
Refresh an expired access token using a valid refresh token. This endpoint maintains user sessions without requiring re-authentication, providing seamless user experience across applications.

### 🔄 Business Logic
- Validates refresh token from cookie or Authorization header
- Extracts user ID and role from refresh token structure
- Generates new access token with updated expiration
- Maintains same refresh token (no rotation in this implementation)
- Updates access token cookie automatically
- Preserves user session state and permissions

### 🔐 Token Validation Process
1. **Token Extraction**: From cookies or Bearer header
2. **Format Validation**: Checks token structure (refresh_userId_role_hash)
3. **Database Verification**: Confirms token exists and is valid
4. **User Validation**: Ensures user account is still active
5. **New Token Generation**: Creates fresh access token
6. **Cookie Update**: Sets new access token in HTTP-only cookie

### 💡 Client Integration
- **Automatic Refresh**: Mobile apps can refresh tokens transparently
- **Background Renewal**: Web apps refresh tokens before expiration
- **Error Recovery**: Handles token refresh failures gracefully
- **Fallback Authentication**: Redirects to login if refresh fails

### 🕐 Token Management
- **Access Token**: New token with 1-hour expiration
- **Refresh Token**: Unchanged, retains original expiration
- **Session Continuity**: User remains logged in seamlessly
- **Security**: Only access token is renewed for security

### 📝 Request Methods
\`\`\`bash
# Using cookies (automatic)
POST /auth/refresh
Cookie: refreshToken=refresh_123_P_abc...

# Using Authorization header
POST /auth/refresh
Authorization: Bearer refresh_123_P_abc...
\`\`\`

### 📝 Detailed Response Example
\`\`\`json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6IlBBUkVOVCIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "issuedAt": "2024-01-01T12:00:00.000Z"
}
\`\`\`

### ⚠️ Error Conditions
- **401 Unauthorized**: Invalid, expired, or malformed refresh token
- **403 Forbidden**: User account disabled or role changed
- **404 Not Found**: User associated with token no longer exists
      `,
    }),
    ApiOkResponseTemplate({
      description: '✅ Access token refreshed successfully',
      type: AuthTokenDto,
    }),
    ApiStatuses(
      StatusCodes.UNAUTHORIZED,
      StatusCodes.FORBIDDEN,
      StatusCodes.NOT_FOUND,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? User Logout
//? ---------------------------------------------------------------------- ?//

export const LogOutDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👋 User Session Logout',
      description: `
### 📝 Feature Description
Terminate user authentication sessions with options for single-device or all-devices logout. This endpoint provides secure session management and token invalidation.

### 🔄 Business Logic
- **Selective Logout**: Provide refresh token to logout specific device only
- **Global Logout**: Omit refresh token to logout from all devices
- Invalidates specified refresh tokens in database/Redis
- Clears HTTP-only authentication cookies
- Graceful error handling (succeeds even with invalid tokens)
- Audit logging for security monitoring

### 🎯 Logout Scenarios
1. **Single Device Logout**: User logs out from current device only
   - Other devices remain authenticated
   - Specific refresh token is invalidated
   - Current session cookies are cleared

2. **All Devices Logout**: User logs out from all devices
   - All refresh tokens for user are invalidated
   - Forces re-authentication on all devices
   - Security-focused approach for compromised accounts

### 🔐 Security Features
- **Token Invalidation**: Removes tokens from server storage
- **Cookie Clearing**: Removes client-side authentication cookies
- **Silent Failure**: Doesn't expose token validity information
- **Audit Trail**: Logs logout events for security monitoring
- **Race Condition Safe**: Handles concurrent logout requests

### 💡 Implementation Details
- Extracts refresh token from request body or cookies
- Parses user ID and role from token structure
- Calls appropriate service method based on token presence
- Clears cookies regardless of token validation outcome
- Returns success status even for invalid tokens (security)

### 📝 Request Examples
\`\`\`json
// Single device logout
{
  "refreshToken": "refresh_123_P_abc123def456"
}

// All devices logout
{
  // Empty body or omit refreshToken
}
\`\`\`

### ✅ Success Response
- **Status**: 200 OK
- **Body**: Empty (void response)
- **Cookies**: Cleared automatically
- **Action**: Session(s) terminated successfully

### 🔄 Post-Logout Behavior
- User must authenticate again to access protected resources
- Client applications should redirect to login screen
- Cached user data should be cleared from client storage
- API requests will return 401 Unauthorized for protected endpoints

### ⚠️ Error Handling
- **Graceful Failure**: Never returns error for logout attempts
- **Cookie Clearing**: Always clears cookies regardless of token validity
- **Silent Operation**: Doesn't reveal information about token status
- **Security First**: Prioritizes security over detailed error reporting
      `,
    }),
    ApiBody({
      type: LogoutDto,
      description: 'Optional refresh token for specific device logout',
    }),
    ApiOkResponseTemplate({
      description: '✅ User logged out successfully',
    }),
    ApiStatuses(StatusCodes.OK),
  );
};
