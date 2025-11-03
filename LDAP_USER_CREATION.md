# LDAP User Creation Feature

## Overview
This feature extends the admin user creation functionality to also create users in your LDAP directory when creating users in STF.

## What's New

When an admin creates a new user through the STF web interface, the user can now be created in both:
1. **STF Database** - As before, for STF internal user management
2. **LDAP Directory** - NEW: Optionally creates the user in your LDAP server

## How It Works

### User Creation Flow

```
1. Admin opens Settings → Users tab
2. Clicks [+] button to show create form
3. Enters user details:
   - Name (required)
   - Email (required)
   - Password (optional) - NEW!
   ↓
4. If password is provided AND LDAP is configured:
   → User created in STF database
   → User created in LDAP directory
   ↓
5. If password is empty OR LDAP not configured:
   → User created in STF database only
   ↓
6. User appears in list automatically
7. Success message indicates if LDAP creation succeeded
```

## Configuration

### Your Current LDAP Setup
Based on your configuration:
```bash
--ldap-url "ldap://localhost:389"
--ldap-search-dn "ou=users,dc=example,dc=com"
--ldap-search-class "inetOrgPerson"
--ldap-search-field "cn"
--ldap-bind-dn "cn=admin,dc=example,dc=com"
--ldap-bind-credentials "admin"
```

### LDAP User Entry Created
When you provide a password, STF will create an LDAP entry with:
- **DN**: `cn={name},ou=users,dc=example,dc=com`
- **Attributes**:
  - `cn`: Username (from name field)
  - `sn`: Full name
  - `mail`: Email address
  - `objectClass`: `['inetOrgPerson', 'organizationalPerson', 'person']`
  - `userPassword`: The password you provide (LDAP will hash it)

### Example
If you create a user with:
- Name: `john`
- Email: `john@example.com`
- Password: `SecurePass123`

LDAP entry created:
```ldif
dn: cn=john,ou=users,dc=example,dc=com
cn: john
sn: john
mail: john@example.com
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
userPassword: SecurePass123
```

## Usage Instructions

### Creating a User with LDAP Integration

1. **Login as Admin**
2. **Navigate to Settings → Users**
3. **Click the [+] button** to show create form
4. **Fill in the form**:
   - **Name**: Enter username (e.g., `john`)
   - **Email**: Enter email address (e.g., `john@example.com`)
   - **Password (for LDAP)**: Enter initial password for LDAP
     - This field is optional
     - If left empty, user is only created in STF
     - If filled, user is created in both STF and LDAP
5. **Click Save**

### Response Messages

- **Success (both STF & LDAP)**:
  ```
  Created (user in STF and LDAP)
  ```

- **Success (STF only)**:
  ```
  Created (user)
  ```

- **Partial Success (STF only, LDAP failed)**:
  ```
  Created (user in STF, LDAP creation failed: [error message])
  ```
  User is still created in STF but not in LDAP. Check logs for details.

- **Failure**:
  ```
  Forbidden (user already exists)
  ```

## Technical Implementation

### Files Modified

1. **lib/util/ldaputil.js**
   - Added `createUser()` function to create users in LDAP

2. **lib/units/api/controllers/users.js**
   - Modified `createUser()` to handle optional LDAP creation

3. **lib/units/api/swagger/api_v1.yaml**
   - Added `password` parameter to the createUser endpoint

4. **res/app/components/stf/users/users-service.js**
   - Updated `createUser()` to pass password parameter

5. **res/app/settings/users/users-controller.js**
   - Updated controller to handle password field

6. **res/app/settings/users/users.pug**
   - Added password input field to the UI

### API Endpoint

**POST** `/api/v1/users/{email}?name={name}&password={password}`

**Parameters**:
- `email` (path, required): User's email address
- `name` (query, required): User's name/username
- `password` (query, optional): Password for LDAP (if omitted, LDAP creation is skipped)

**Authorization**: Admin only

## Important Notes

### Security Considerations

1. **Password Transmission**: Currently, the password is sent as a URL query parameter. Consider using HTTPS to encrypt traffic.

2. **Password Storage**: 
   - STF does NOT store the password
   - Password is only sent to LDAP
   - LDAP handles password hashing/storage

3. **Admin Access**: Only users with `admin` privilege can create users

### Error Handling

- If LDAP creation fails, the user is still created in STF
- Error messages are logged on the server
- User receives a notification indicating partial success
- Common LDAP errors:
  - User already exists (code 68)
  - Invalid credentials for bind DN
  - Connection timeout
  - Invalid DN format

### LDAP Schema Requirements

Your LDAP server must support:
- `inetOrgPerson` object class
- Standard attributes: `cn`, `sn`, `mail`, `userPassword`

If your LDAP schema differs, modify the `createUser()` function in `lib/util/ldaputil.js` to match your schema.

## Testing

### Test Without LDAP (Existing Behavior)
1. Create user with name and email only (no password)
2. User should be created in STF database
3. User can login if they exist in LDAP

### Test With LDAP Integration
1. Create user with name, email, and password
2. User should be created in both STF and LDAP
3. User can immediately login with the provided credentials
4. Verify in LDAP: `ldapsearch -x -H ldap://localhost:389 -D "cn=admin,dc=example,dc=com" -w admin -b "ou=users,dc=example,dc=com" "(cn=username)"`

### Test Error Handling
1. Try creating a user that already exists in LDAP
2. Should see partial success message
3. User created in STF but not in LDAP

## Troubleshooting

### User Created in STF but Not in LDAP

**Check server logs** for error messages like:
```
User created in STF but failed to create in LDAP: [error details]
```

Common causes:
1. LDAP server not accessible
2. Invalid bind credentials
3. Insufficient permissions for bind DN
4. User already exists in LDAP
5. Invalid DN format or attributes

### How to Verify LDAP User Creation

```bash
# Search for the user in LDAP
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "ou=users,dc=example,dc=com" \
  "(cn=username)"
```

### Testing LDAP Bind Credentials

```bash
# Test if your bind DN and credentials work
ldapwhoami -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin
```

## Customization

### Modifying LDAP Entry Attributes

Edit `lib/util/ldaputil.js`, function `createUser()`:

```javascript
// Customize this section
var entry = {
  cn: username
, sn: name || username
, mail: email
, objectClass: [options.search.objectClass, 'organizationalPerson', 'person']
, userPassword: password
// Add more attributes as needed:
// , displayName: name
// , uid: username
// , telephoneNumber: phone
}
```

### Changing DN Format

Currently: `cn={username},ou=users,dc=example,dc=com`

To change, edit this line in `lib/util/ldaputil.js`:
```javascript
var userDn = 'cn=' + username + ',' + options.search.dn
```

Example for UID format:
```javascript
var userDn = 'uid=' + username + ',' + options.search.dn
```

## Rollback

If you need to disable LDAP user creation:
- Simply leave the password field empty when creating users
- Users will only be created in STF database
- Existing functionality remains unchanged

## Next Steps

After implementing this feature:
1. Test with your LDAP server configuration
2. Monitor server logs for any LDAP connection issues
3. Consider securing the password transmission (use HTTPS)
4. Optionally customize LDAP attributes for your organization's schema
5. Update any user documentation or admin guides

## Support

For issues:
1. Check server logs for detailed error messages
2. Verify LDAP server is accessible and bind credentials are correct
3. Test LDAP connection independently using `ldapsearch`
4. Ensure LDAP schema supports required attributes

