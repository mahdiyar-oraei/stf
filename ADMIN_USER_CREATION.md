# Admin User Creation Feature

## Overview
The STF (Smartphone Test Farm) application already has a fully implemented feature that allows administrators to create new users through the web interface.

## Feature Status: ✅ COMPLETE

### Security Implementation

#### Frontend Access Control
- **Location**: `res/app/settings/settings-controller.js` (lines 29-51)
- The "Users" tab in Settings is only visible to users with `admin` privilege
- Regular users cannot see or access the user management interface

#### Backend API Security
- **Endpoint**: `POST /api/v1/users/{email}?name={name}`
- **Security Handler**: `lib/units/api/helpers/securityHandlers.js`
- Tagged with `admin` in Swagger API definition
- **Protection Layers**:
  1. Access token authentication checks admin privilege (lines 62-68)
  2. Session-based authentication now also checks admin privilege (lines 98-104) **[SECURITY FIX APPLIED]**
  3. Returns `403 Forbidden` if non-admin tries to access

### How It Works

#### 1. User Interface
**Location**: `res/app/settings/users/users.pug` (lines 24-51)

Admin users see:
- A **[+]** button to toggle the create user form
- Form fields:
  - **Name**: Text input with regex validation (`/^[0-9a-zA-Z-_. ]{1,50}$/`)
  - **Email**: Email input with HTML5 validation
  - **Save** button (disabled when form is invalid)

#### 2. Frontend Service
**Location**: `res/app/components/stf/users/users-service.js` (lines 75-77)

```javascript
UsersService.createUser = function(name, email) {
  return $http.post('/api/v1/users/' + email + '?name=' + name)
}
```

#### 3. Backend API Controller
**Location**: `lib/units/api/controllers/users.js` (lines 349-366)

- Validates that the user doesn't already exist
- Creates the user in the database
- Returns `201 Created` with user information
- Returns `403 Forbidden` if user already exists

#### 4. Database Layer
**Location**: `lib/db/api.js` (lines 1125-1176)

When a user is created:
- Assigned a unique email (primary key)
- Given a name
- Assigned a private communication channel
- Privilege set to `USER` (if admin exists) or `ADMIN` (first user)
- Allocated default group quotas from admin settings
- Added to the root group automatically

#### 5. Real-time Updates
**Location**: `lib/units/groups-engine/watchers/users.js` (lines 50-52)

- Database changes are monitored via RethinkDB changefeeds
- When a user is created, a `UserChangeMessage` is broadcast
- All connected admin clients receive the update via WebSocket
- Frontend automatically adds the new user to the list without page refresh

### User Creation Flow

```
1. Admin opens Settings → Users tab
2. Clicks [+] button to show create form
3. Enters user name and email
4. Clicks "Save" button
   ↓
5. Frontend validates form (regex, email format)
6. Sends POST request to /api/v1/users/{email}?name={name}
   ↓
7. Backend checks admin privilege
8. Backend validates user doesn't exist
9. Backend creates user in database
   ↓
10. Database watcher detects change
11. Broadcasts UserChangeMessage via WebSocket
    ↓
12. Frontend receives 'user.settings.users.created' event
13. New user appears in list automatically
14. Success notification shown
```

### Default User Properties

New users are created with:
- **Email**: As provided
- **Name**: As provided
- **Privilege**: `user` (regular user, not admin)
- **IP**: From the admin making the request
- **Groups Quotas**: Inherited from admin's default quota settings:
  - Number of groups
  - Total duration of groups (milliseconds)
  - Number of repetitions per group
- **Auto-enrolled**: Added to root group automatically
- **Private Channel**: For real-time device communication

### API Documentation

#### Request
```http
POST /api/v1/users/{email}?name={name}
Authorization: Bearer {access_token}
```

**Parameters**:
- `email` (path, required): User's email address (will be the user ID)
- `name` (query, required): User's display name

**Tags**: `admin` (admin-only operation)

#### Responses

**201 Created** - User successfully created
```json
{
  "success": true,
  "description": "Created (user)",
  "user": {
    "email": "john@example.com",
    "name": "John Doe",
    "privilege": "user",
    "groups": {
      "quotas": { ... }
    }
  }
}
```

**403 Forbidden** - User already exists or not admin
```json
{
  "success": false,
  "description": "Forbidden (user already exists)"
}
```
or
```json
{
  "success": false,
  "description": "Forbidden: privileged operation (admin)"
}
```

### Related Files

#### Backend
- `/lib/units/api/swagger/api_v1.yaml` - API endpoint definition
- `/lib/units/api/controllers/users.js` - Controller logic
- `/lib/units/api/helpers/securityHandlers.js` - Authentication & authorization
- `/lib/db/api.js` - Database operations
- `/lib/units/groups-engine/watchers/users.js` - Change detection & broadcasting
- `/lib/units/websocket/index.js` - WebSocket event routing

#### Frontend
- `/res/app/settings/settings-controller.js` - Tab visibility control
- `/res/app/settings/users/users-controller.js` - User management logic
- `/res/app/settings/users/users.pug` - User interface
- `/res/app/settings/users/users.css` - Styling
- `/res/app/components/stf/users/users-service.js` - API client
- `/res/app/components/stf/users/index.js` - Module definition

### Security Fix Applied

**Issue**: The session-based authentication path (for browser requests) was not checking admin privileges for admin-tagged operations.

**Fix**: Added admin privilege check in `lib/units/api/helpers/securityHandlers.js` (lines 98-104) to ensure both access token and session-based authentication enforce admin restrictions.

### Testing the Feature

#### As Admin:
1. Log in with admin credentials
2. Navigate to Settings → Users tab (should be visible)
3. Click the **[+]** button
4. Enter a name (e.g., "Test User") and email (e.g., "test@example.com")
5. Click "Save"
6. New user should appear in the list immediately
7. Try creating the same user again - should fail with "user already exists"

#### As Regular User:
1. Log in with regular user credentials
2. Navigate to Settings
3. Users tab should NOT be visible
4. Attempting direct API call should return 403 Forbidden

### Additional Features Available

The Users management panel also provides:
- **View all users** with filtering and pagination
- **Remove users** (individual or bulk, admin only)
- **Update user quotas** for groups
- **Set default quotas** for new users
- **Contact users** via email
- **Real-time synchronization** across all admin sessions

## Conclusion

The admin user creation feature is **fully operational and secure**. A security enhancement has been applied to ensure proper admin privilege checking for all authentication methods.

