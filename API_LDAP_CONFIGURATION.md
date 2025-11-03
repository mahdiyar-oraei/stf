# API Server LDAP Configuration - REQUIRED FIX

## The Problem

**User creation in LDAP was failing silently** because the API server didn't have LDAP configuration!

The LDAP options were only configured for the `auth-ldap` server (for login), but NOT for the `api` server (for user creation).

## The Fix

I've added LDAP configuration options to the API server CLI.

## How to Start API Server with LDAP

You need to add the **same LDAP parameters** to your API server startup command as you use for auth-ldap.

### Your Current Auth-LDAP Config
```bash
--ldap-url "ldap://localhost:389"
--ldap-search-dn "ou=users,dc=example,dc=com"
--ldap-search-class "inetOrgPerson"
--ldap-search-field "cn"
--ldap-bind-dn "cn=admin,dc=example,dc=com"
--ldap-bind-credentials "admin"
```

### Add These Parameters to Your API Server

When starting the API server, add:

```bash
stf api \
  --port 7106 \
  --secret "YOUR_SECRET" \
  --connect-push tcp://127.0.0.1:7150 \
  --connect-sub tcp://127.0.0.1:7151 \
  --connect-push-dev tcp://127.0.0.1:7250 \
  --connect-sub-dev tcp://127.0.0.1:7251 \
  --ldap-url "ldap://localhost:389" \
  --ldap-bind-dn "cn=admin,dc=example,dc=com" \
  --ldap-bind-credentials "admin" \
  --ldap-search-dn "ou=users,dc=example,dc=com" \
  --ldap-search-class "inetOrgPerson" \
  --ldap-search-field "cn"
```

### Available LDAP Options for API Server

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--ldap-url` | LDAP server URL | - | Yes (for LDAP creation) |
| `--ldap-bind-dn` | Admin DN for binding | - | Yes (for LDAP creation) |
| `--ldap-bind-credentials` | Admin password | - | Yes (for LDAP creation) |
| `--ldap-search-dn` | Base DN for users | - | Yes (for LDAP creation) |
| `--ldap-search-class` | Object class for users | `inetOrgPerson` | No |
| `--ldap-search-field` | Username field | `cn` | No |
| `--ldap-search-scope` | Search scope | `sub` | No |
| `--ldap-timeout` | Timeout in ms | `5000` | No |

## Environment Variables (Alternative)

You can also use environment variables instead of command-line options:

```bash
export STF_API_LDAP_URL="ldap://localhost:389"
export STF_API_LDAP_BIND_DN="cn=admin,dc=example,dc=com"
export STF_API_LDAP_BIND_CREDENTIALS="admin"
export STF_API_LDAP_SEARCH_DN="ou=users,dc=example,dc=com"
export STF_API_LDAP_SEARCH_CLASS="inetOrgPerson"
export STF_API_LDAP_SEARCH_FIELD="cn"

stf api --port 7106 --secret "YOUR_SECRET" ...
```

## Complete Example

### If Using stf local

Your `stf local` command needs to be updated. Check how you're currently starting STF and add the LDAP parameters.

If you're using a startup script, add the LDAP options to the API server section.

### Docker Compose Example

If using docker-compose, add environment variables:

```yaml
api:
  environment:
    - STF_API_LDAP_URL=ldap://ldap:389
    - STF_API_LDAP_BIND_DN=cn=admin,dc=example,dc=com
    - STF_API_LDAP_BIND_CREDENTIALS=admin
    - STF_API_LDAP_SEARCH_DN=ou=users,dc=example,dc=com
    - STF_API_LDAP_SEARCH_CLASS=inetOrgPerson
    - STF_API_LDAP_SEARCH_FIELD=cn
```

## Testing After Configuration

### Step 1: Restart API Server with LDAP Config

Stop your current API server and restart with the LDAP parameters.

### Step 2: Create a Test User

Via STF UI (Settings → Users):
- Name: `johndoe`
- Email: `johndoe@example.com`
- Password: `Test123!`

### Step 3: Check API Server Logs

You should now see:
```
[LDAP DEBUG] Creating user with: { username: 'johndoe', ... }
[LDAP DEBUG] Bind successful
[LDAP DEBUG] Adding user with DN: cn=johndoe,ou=users,dc=example,dc=com
[LDAP DEBUG] User created successfully in LDAP
```

### Step 4: Verify in LDAP

```bash
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "ou=users,dc=example,dc=com" \
  "(cn=johndoe)"
```

Should return the user entry.

### Step 5: Login

Login with:
- Username: `johndoe` (NOT the email!)
- Password: `Test123!`

Auth-ldap logs should show:
```
[LDAP DEBUG] Login attempt for username: johndoe
[LDAP DEBUG] User found: cn=johndoe,ou=users,dc=example,dc=com
[LDAP DEBUG] User bind successful - authentication OK
```

## Without LDAP Configuration

If you don't provide LDAP parameters to the API server:
- ✅ User creation in STF database works
- ❌ User creation in LDAP is **skipped**
- ❌ Login will fail (user not in LDAP)

## Common Mistakes

### ❌ Mistake 1: Only Configuring auth-ldap
```bash
# This is NOT enough!
stf auth-ldap --ldap-url ldap://localhost:389 ...
```

You need LDAP config on **BOTH**:
- `stf auth-ldap` - for login authentication
- `stf api` - for user creation in LDAP

### ❌ Mistake 2: Different Configurations
Make sure both servers use the **SAME** LDAP configuration:
- Same URL
- Same bind DN and credentials
- Same search DN
- Same object class and field

### ❌ Mistake 3: Missing Required Parameters
All of these are required for LDAP user creation:
- `--ldap-url`
- `--ldap-bind-dn`
- `--ldap-bind-credentials`
- `--ldap-search-dn`

## Verification Checklist

After restarting with LDAP config:

- [ ] API server started successfully
- [ ] No errors about LDAP in logs
- [ ] Created a test user via UI
- [ ] Saw `[LDAP DEBUG] User created successfully` in API logs
- [ ] User exists in LDAP (verified with ldapsearch)
- [ ] Can login with username and password
- [ ] Saw `[LDAP DEBUG] User bind successful` in auth-ldap logs

## Troubleshooting

### Error: Cannot Connect to LDAP

**Logs show**: `[LDAP DEBUG] Bind failed: Connection refused`

**Solution**: 
- Check LDAP server is running
- Verify LDAP URL is correct
- Check firewall/network access

### Error: Invalid Credentials

**Logs show**: `[LDAP DEBUG] Bind failed: Invalid credentials`

**Solution**:
- Verify bind DN is correct: `cn=admin,dc=example,dc=com`
- Verify bind credentials (password) is correct
- Test manually:
```bash
ldapwhoami -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin
```

### Error: Invalid DN Syntax

**Logs show**: `[LDAP DEBUG] Add user failed: Invalid DN syntax`

**Solution**:
- Verify search DN is correct: `ou=users,dc=example,dc=com`
- Make sure the organizational unit exists in LDAP
- Check with:
```bash
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "dc=example,dc=com" \
  "(ou=users)"
```

### Still Not Working?

1. Check API server logs for `[LDAP DEBUG]` messages
2. Verify LDAP options are being passed (should see them in debug output)
3. Test LDAP connection independently
4. Make sure both auth-ldap and api servers have LDAP config

## Summary

The fix requires:

1. ✅ Update API server code (already done)
2. ⚠️ **Restart API server with LDAP parameters** (YOU NEED TO DO THIS)
3. ✅ Debug logging in place to verify it works

**Critical**: Without adding LDAP parameters to your API server startup command, user creation in LDAP will NOT work!

