# Troubleshooting Fixes Applied

## Issue 1: Device Assignment API Error

### Error Message
```
ReqlQueryLogicError: Primary keys must be either a number, string, bool, pseudotype or array (got type OBJECT):
{"email": "user1@exmpleuser.com"}
```

### Root Cause
The `assignDeviceToUser` function was trying to pass the entire request body object to `dbapi.loadUser()` instead of extracting the email string. This happened because:

```javascript
// WRONG: This extracts the swagger parameter (undefined) or the body object
const email = req.swagger.params.email ? req.swagger.params.email.value : req.body.email
// This resulted in: email = {"email": "user1@exmpleuser.com"} (an object, not a string)
```

RethinkDB's `.get()` expects a string (the email), not an object.

### Fix Applied
**File**: `lib/units/api/controllers/devices.js`

Changed line 548 from:
```javascript
const email = req.swagger.params.email ? req.swagger.params.email.value : req.body.email
```

To:
```javascript
const email = req.body.email // Email comes from request body
```

Added validation:
```javascript
if (!email) {
  return apiutil.respond(res, 400, 'Bad Request: email is required')
}
```

### Testing
```bash
curl -X PUT http://85.10.196.131:7100/api/v1/devices/emulator-5560/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-cookie]" \
  -H "X-XSRF-TOKEN: [your-token]" \
  -d '{"email":"user1@example.com"}'
```

**Note**: Fix the typo - `exmpleuser.com` → `example.com`

---

## Issue 2: LDAP Authentication Failure

### Error Message
```
WRN/auth-ldap Authentication failure for "Alldef"
Unhandled rejection InvalidCredentialsError
at EventEmitter.endListener (/root/stf/lib/util/ldaputil.js:78:25)
```

### Potential Causes

1. **User not created in LDAP** - LDAP creation failed but STF user was created
2. **Wrong login username** - Using email instead of username/cn
3. **LDAP configuration issue** - Search DN or field mismatch

### Debug Logging Added

Added comprehensive debug logging to track what's happening:

**File**: `lib/util/ldaputil.js`

#### During User Creation:
- LDAP connection parameters
- Bind DN and credentials (not password)
- User DN being created
- Full entry details
- Success/failure messages

#### During Login:
- Username being searched
- LDAP search configuration
- Admin bind status
- Search filter being used
- Whether user was found
- Bind attempt details
- Success/failure reasons

### How to Use Debug Logs

1. **Restart STF servers** to apply the changes

2. **Create a new user** via Settings → Users:
   - Name: `testuser`
   - Email: `testuser@example.com`
   - Password: `Test123!`

3. **Check API server logs** for:
```
[LDAP DEBUG] Creating user with: { username: 'testuser', ... }
[LDAP DEBUG] Bind successful
[LDAP DEBUG] Adding user with DN: cn=testuser,ou=users,dc=example,dc=com
[LDAP DEBUG] User created successfully in LDAP
```

Or if it failed:
```
[LDAP DEBUG] Bind failed: ...
[LDAP DEBUG] Add user failed: ...
```

4. **Try to login** with username `testuser` and password `Test123!`

5. **Check auth-ldap server logs** for:
```
[LDAP DEBUG] Login attempt for username: testuser
[LDAP DEBUG] Admin bind successful
[LDAP DEBUG] Searching for user with filter: (&(objectClass=inetOrgPerson)(cn=testuser))
[LDAP DEBUG] User found: cn=testuser,ou=users,dc=example,dc=com
[LDAP DEBUG] User bind successful - authentication OK
```

Or if failed:
```
[LDAP DEBUG] User not found in LDAP directory
```

### Common Issues and Solutions

#### Issue: User Not Found in LDAP

**Debug output shows**:
```
[LDAP DEBUG] User not found in LDAP directory
```

**Cause**: User wasn't created in LDAP (creation failed silently)

**Solution**: Manually verify and create:

```bash
# Check if user exists
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "ou=users,dc=example,dc=com" \
  "(cn=testuser)"

# If not found, create manually
cat > testuser.ldif << EOF
dn: cn=testuser,ou=users,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
cn: testuser
sn: testuser
mail: testuser@example.com
userPassword: Test123!
EOF

ldapadd -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -f testuser.ldif
```

#### Issue: Wrong Login Username

**Symptom**: Created user with name "Alldef" but login with "alldef@gmail.com" fails

**Cause**: LDAP search field is configured as `cn` (Common Name), so you must login with the NAME, not the EMAIL

**Your LDAP Config**:
```bash
--ldap-search-field "cn"
```

**Solution**: Login with the username (from Name field), not the email:
- ✅ Login with: `Alldef` or `testuser`
- ❌ Don't login with: `alldef@gmail.com`

#### Issue: LDAP Bind Fails

**Debug output shows**:
```
[LDAP DEBUG] Bind failed: Invalid credentials
```

**Cause**: LDAP admin credentials are wrong

**Solution**: Verify admin credentials work:
```bash
ldapwhoami -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin
```

#### Issue: User Creation Shows Success But Login Fails

**Symptoms**:
- User creation in STF UI succeeds
- Login fails immediately

**Check**:
1. Look at the response message when creating user
2. If it says: `"Created (user in STF, LDAP creation failed: ...)"`
   - User is ONLY in STF database
   - User is NOT in LDAP directory
   - Login will fail

**Solution**: Check the error message for why LDAP creation failed, then manually create the user in LDAP

### Verification Checklist

- [ ] STF API server restarted
- [ ] Auth-ldap server restarted
- [ ] Debug logs visible in console/logs
- [ ] Can see `[LDAP DEBUG]` messages
- [ ] LDAP admin bind credentials verified
- [ ] User created successfully in LDAP
- [ ] Login using username (cn), not email
- [ ] Password matches what was set

### Testing Procedure

1. **Delete existing test user from STF** (if exists)

2. **Check LDAP is accessible**:
```bash
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "dc=example,dc=com" \
  "(objectClass=*)"
```

3. **Create new user via STF UI**:
   - Name: `johndoe`
   - Email: `johndoe@example.com`
   - Password: `SecurePass123`

4. **Watch API server logs** for:
   - `[LDAP DEBUG] Creating user with:`
   - `[LDAP DEBUG] User created successfully in LDAP`

5. **Verify in LDAP**:
```bash
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "ou=users,dc=example,dc=com" \
  "(cn=johndoe)"
```

Expected output:
```
dn: cn=johndoe,ou=users,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
cn: johndoe
sn: johndoe
mail: johndoe@example.com
```

6. **Try to login**:
   - Username: `johndoe` (NOT the email!)
   - Password: `SecurePass123`

7. **Watch auth-ldap server logs** for:
   - `[LDAP DEBUG] Login attempt for username: johndoe`
   - `[LDAP DEBUG] User found:`
   - `[LDAP DEBUG] User bind successful`

### Cleanup Debug Logs (Optional)

Once you've identified and fixed the issue, you can remove the debug logs by commenting out or removing the `console.log()` and `console.error()` statements from `lib/util/ldaputil.js`.

Or keep them for future troubleshooting!

---

## Summary of Changes

### Files Modified

1. **lib/units/api/controllers/devices.js**
   - Fixed device assignment email parameter extraction
   - Added validation for missing email

2. **lib/util/ldaputil.js**
   - Added comprehensive debug logging for user creation
   - Added comprehensive debug logging for login/authentication
   - Logs show exact LDAP operations and results

### Next Steps

1. ✅ Restart all STF servers
2. ✅ Check debug logs are working
3. ✅ Retry device assignment
4. ✅ Recreate LDAP user with debug logs
5. ✅ Login with username (not email)
6. ✅ Verify authentication works

### Getting Help

If issues persist, share these debug log outputs:

1. **When creating user** - full API server console output
2. **When trying to login** - full auth-ldap server console output
3. **LDAP directory listing**:
```bash
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=*)"
```

The debug logs will tell us exactly what's happening at each step!

