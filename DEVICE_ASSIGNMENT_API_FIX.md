# Device Assignment API Endpoints - Fixed

## Issue
Device assignment endpoints were returning **404 Not Found** errors because they were not defined in the Swagger API specification (`api_v1.yaml`), even though the controller functions existed.

## Root Cause
The device assignment feature was implemented with:
- ✅ Backend controller functions in `lib/units/api/controllers/devices.js`
- ✅ Database functions in `lib/db/api.js`
- ✅ Frontend service in `res/app/components/stf/device-assignment/device-assignment-service.js`
- ❌ **Missing**: API endpoint definitions in `lib/units/api/swagger/api_v1.yaml`

Without Swagger definitions, the API router doesn't know these endpoints exist, resulting in 404 errors.

## Solution Applied

Added the following endpoint definitions to `lib/units/api/swagger/api_v1.yaml`:

### 1. Assign Device to User
**PUT** `/api/v1/devices/{serial}/assign`

Assigns a device to a specific user (admin only).

**Parameters**:
- `serial` (path): Device serial number
- `email` (body): User email to assign device to

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "description": "Device assigned successfully",
  "serial": "emulator-5560",
  "assignedUser": "user@example.com"
}
```

### 2. Unassign Device from User
**DELETE** `/api/v1/devices/{serial}/assign`

Removes device assignment (admin only).

**Parameters**:
- `serial` (path): Device serial number

**Response** (200 OK):
```json
{
  "success": true,
  "description": "Device unassigned successfully"
}
```

### 3. Get Devices Assigned to User
**GET** `/api/v1/devices/assigned/{email}`

Returns all devices assigned to a specific user (admin only).

**Parameters**:
- `email` (path): User email

**Response** (200 OK):
```json
{
  "success": true,
  "devices": [
    {
      "serial": "emulator-5560",
      "assignedUser": "user@example.com",
      ...
    }
  ]
}
```

### 4. Observe Device (Read-Only Mode)
**GET** `/api/v1/user/devices/{serial}/observe`

Allows admin to observe a busy device in read-only mode (admin only).

**Parameters**:
- `serial` (path): Device serial number

**Response** (200 OK):
```json
{
  "success": true,
  "description": "Observation mode enabled",
  "device": { ... },
  "observeMode": true
}
```

## Testing Your Fixed Endpoint

Your original curl command should now work:

```bash
curl 'http://85.10.196.131:7100/api/v1/devices/emulator-5560/assign' \
  -X 'PUT' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  -H 'Cookie: ssid=...; ssid.sig=...; XSRF-TOKEN=...' \
  -H 'X-XSRF-TOKEN: aTbYdhAV-DQWC0BDdUVj1-uf2BPyHLuNqY9ECv0mdMBGcYnHXoJg' \
  --data-raw '{"email":"user1@exmpleuser.com"}'
```

**Note**: Fix the typo in email: `exmpleuser.com` → `example.com`

## Important: Restart Required

⚠️ **You must restart the STF API server** for the Swagger definition changes to take effect:

```bash
# Stop the API server
# Then start it again with your normal command
stf api ...
```

The Swagger specification is loaded at server startup, so the changes won't be active until restart.

## Verification Steps

After restarting:

1. **Check Swagger UI**:
   - Visit: `http://85.10.196.131:7100/api-docs/`
   - Should see the new device assignment endpoints

2. **Test Assign Device**:
```bash
curl -X PUT http://85.10.196.131:7100/api/v1/devices/emulator-5560/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-cookie]" \
  -H "X-XSRF-TOKEN: [your-token]" \
  -d '{"email":"user1@example.com"}'
```

3. **Test Get Assigned Devices**:
```bash
curl http://85.10.196.131:7100/api/v1/devices/assigned/user1@example.com \
  -H "Cookie: [your-cookie]"
```

4. **Test Unassign Device**:
```bash
curl -X DELETE http://85.10.196.131:7100/api/v1/devices/emulator-5560/assign \
  -H "Cookie: [your-cookie]" \
  -H "X-XSRF-TOKEN: [your-token]"
```

## Security Notes

All these endpoints are **admin-only**:
- Tagged with `admin` in Swagger
- Controller checks `req.user.privilege === apiutil.ADMIN`
- Returns 403 Forbidden if non-admin tries to access

## Related Files Modified

- `lib/units/api/swagger/api_v1.yaml` - Added endpoint definitions

## Related Files (Already Existed)

- `lib/units/api/controllers/devices.js` - Controller functions
- `lib/db/api.js` - Database functions
- `res/app/components/stf/device-assignment/device-assignment-service.js` - Frontend service
- `res/app/settings/device-assignment/device-assignment-controller.js` - Frontend controller

## Complete Feature Set

With this fix, the device assignment feature now provides:

1. ✅ Assign devices to specific users
2. ✅ Unassign devices
3. ✅ Query devices by assigned user
4. ✅ Device access control based on assignment
5. ✅ Admin observation mode for busy devices
6. ✅ Frontend UI for managing assignments
7. ✅ Real-time updates via WebSocket

## Troubleshooting

### Still Getting 404?
- Ensure you've restarted the API server
- Check server logs for Swagger parsing errors
- Verify the YAML syntax is correct

### Getting 403 Forbidden?
- Verify you're logged in as admin
- Check the `privilege` field in your user record
- Admin users should have `privilege: "admin"`

### Getting 404 "Device not found"?
- Verify the device serial is correct
- Check if device exists: `GET /api/v1/devices/{serial}`

### Getting 404 "User not found"?
- Verify the user email exists in database
- Check if user exists: `GET /api/v1/users/{email}` (admin only)

## Future Improvements

Consider these enhancements:
1. Add bulk assignment endpoint
2. Add assignment history/audit log
3. Add notification when user is assigned a device
4. Add API to list unassigned devices only
5. Add assignment expiration/timeout

## Support

For issues:
1. Check STF API server logs
2. Verify Swagger spec loaded correctly at startup
3. Test endpoints via Swagger UI first
4. Ensure admin authentication is working

