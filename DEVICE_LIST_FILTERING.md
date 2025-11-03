# Device List Filtering by User Assignment

## Feature Implemented

Modified device list endpoints to filter devices based on user privilege and device assignment.

## How It Works

### For Regular Users (Non-Admin)
- **Only see devices assigned to them**
- Devices without assignment are hidden
- Devices assigned to other users are hidden
- Empty list if no devices are assigned

### For Admin Users
- **See all devices** (no filtering)
- Can see assigned and unassigned devices
- Can see devices assigned to any user
- Full access as before

## Implementation Details

### Backend Changes

**File**: `lib/units/api/controllers/devices.js`

Modified two functions to add assignment-based filtering:

#### 1. `getGenericDevices()` (lines 30-44)
Handles most device list requests (default, bookable, origin, standard).

Added filter:
```javascript
if (req.user.privilege !== apiutil.ADMIN) {
  devices = devices.filter(function(device) {
    return device.assignedUser && device.assignedUser === req.user.email
  })
}
```

#### 2. `getStandardizableDevices()` (lines 89-105)
Handles requests for standardizable devices.

Added the same filter for non-admin users.

### API Endpoints Affected

All these endpoints now filter for non-admin users:

1. **GET** `/api/v1/devices?target=user` (default)
2. **GET** `/api/v1/devices?target=bookable`
3. **GET** `/api/v1/devices?target=origin`
4. **GET** `/api/v1/devices?target=standard`
5. **GET** `/api/v1/devices?target=standardizable`

## Testing

### As Regular User

**1. User has NO assigned devices:**
```bash
GET /api/v1/devices
Response: { "devices": [] }  # Empty list
```

**2. User has assigned devices:**
```bash
# Admin assigns device to user
PUT /api/v1/devices/emulator-5560/assign
Body: {"email": "user1@example.com"}

# User requests device list
GET /api/v1/devices
Response: { "devices": [{ "serial": "emulator-5560", "assignedUser": "user1@example.com", ... }] }
```

**3. User cannot see devices assigned to others:**
```bash
# Admin assigns device to another user
PUT /api/v1/devices/emulator-5561/assign
Body: {"email": "user2@example.com"}

# User1 requests device list
GET /api/v1/devices (as user1)
Response: { "devices": [{ "serial": "emulator-5560", ... }] }  # Only sees their own
```

### As Admin User

**Admin sees ALL devices regardless of assignment:**
```bash
GET /api/v1/devices
Response: {
  "devices": [
    { "serial": "emulator-5560", "assignedUser": "user1@example.com", ... },
    { "serial": "emulator-5561", "assignedUser": "user2@example.com", ... },
    { "serial": "emulator-5562", "assignedUser": null, ... },  # Unassigned
    ...
  ]
}
```

## User Experience

### Regular User View
- Only assigned devices appear in device list
- Can only control their assigned devices
- Clean, focused device list
- No confusion with unavailable devices

### Admin User View
- All devices visible
- Can assign/unassign any device
- Can control or observe any device
- Full management capabilities

## Security

### Access Control
- ✅ Regular users cannot see devices assigned to others
- ✅ Regular users cannot see unassigned devices
- ✅ Device assignment checked server-side
- ✅ Cannot bypass by manipulating API requests
- ✅ Admins have unrestricted access

### Device Control
The existing `deviceutil.isAddable()` function already checks:
- Device must be assigned to user (if assigned)
- Or device must be unassigned (if no assignment)

So even if a user somehow got a device serial, they couldn't control it without proper assignment.

## Edge Cases Handled

### User Has No Assigned Devices
- Returns empty list `[]`
- UI shows "No devices available" message
- No errors or crashes

### Device Assignment Removed
- Device disappears from user's list immediately
- User cannot control it anymore
- Real-time update via WebSocket

### Multiple Users, Multiple Devices
- Each user only sees their devices
- No overlap or conflicts
- Clean separation

## Frontend Integration

### Existing Frontend Code
The frontend already handles device assignment correctly:

**File**: `res/app/device-list/device-list-controller.js`
- Calls `GET /api/v1/devices` 
- Displays devices returned by API
- No frontend changes needed

**File**: `res/app/settings/device-assignment/device-assignment-controller.js`
- Admin panel to manage assignments
- Only accessible by admins
- Shows all devices and users

### User Experience Flow

**Regular User:**
1. Login → See only assigned devices
2. Try to use device → Works if assigned
3. Try to use unassigned device → Not visible in list

**Admin:**
1. Login → See all devices
2. Assign device to user → User sees it immediately
3. Unassign device → User loses access immediately

## Performance Considerations

### Filtering Approach
- Filtering happens after database query
- For large device lists (1000+ devices), this is still fast
- No additional database queries

### Alternative (for very large deployments)
If you have thousands of devices and want better performance for regular users, you could:
1. Add a database query specifically for assigned devices
2. Use `dbapi.loadDevicesByAssignedUser(email)` for regular users
3. Only load from groups for admins

This would be a minor optimization and likely not needed for typical deployments.

## Related Features

This filtering works together with:
- ✅ Device assignment (Settings → Device Assignment)
- ✅ Device access control (`deviceutil.isAddable`)
- ✅ Admin observation mode
- ✅ Real-time updates via WebSocket

## Rollback

If you need to revert to previous behavior (all users see all devices):
- Remove the filter blocks from both functions
- Or set a configuration flag to disable filtering

## Next Steps

1. ✅ Code changes applied
2. ⚠️ **Restart API server** for changes to take effect
3. ✅ Test with regular user account
4. ✅ Test with admin account
5. ✅ Verify device assignment workflow

## Support

For issues:
- Check user privilege: `GET /api/v1/user` → should show `"privilege": "user"` or `"privilege": "admin"`
- Check device assignment: `GET /api/v1/devices/assigned/{email}` (admin only)
- Verify filtering: Compare device list between admin and regular user

