# Quick Fix - LDAP User Creation

## The Problem
User creation in LDAP wasn't working because the API server didn't have LDAP configuration.

## The Fix (Already Applied)
✅ Modified `lib/cli/local/index.js` - API server now receives LDAP options  
✅ Modified `lib/cli/api/index.js` - API server can accept LDAP options  
✅ Added debug logging to verify LDAP config

## What You Need to Do

### Step 1: RESTART STF Server

**Stop your current STF server** (Ctrl+C), then restart with the **SAME command**:

```bash
stf local \
  --auth-type ldap \
  --auth-options '[
    "--ldap-url", "ldap://localhost:389",
    "--ldap-search-dn", "ou=users,dc=example,dc=com",
    "--ldap-search-class", "inetOrgPerson",
    "--ldap-search-field", "cn",
    "--ldap-bind-dn", "cn=admin,dc=example,dc=com",
    "--ldap-bind-credentials", "admin"
  ]'
```

### Step 2: Create a Test User

Via UI (Settings → Users) or curl:

```bash
curl 'http://85.10.196.131:7100/api/v1/users/testuser@example.com?name=testuser&password=Test123!' \
  -X 'POST' \
  -H 'Cookie: [your-cookie]' \
  -H 'X-XSRF-TOKEN: [your-token]'
```

### Step 3: Check API Server Logs

You should now see:

```
[API DEBUG] Creating user: { email: 'testuser@example.com', name: 'testuser', hasPassword: true, hasLdapConfig: true }
[API DEBUG] LDAP config present: { url: 'ldap://localhost:389', ... }
[LDAP DEBUG] Creating user with: { username: 'testuser', ... }
[LDAP DEBUG] User created successfully in LDAP
```

**If you see**: `[API DEBUG] NO LDAP configuration found in req.options!`  
→ The config isn't being passed. Check your startup command.

### Step 4: Verify in LDAP

```bash
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w admin \
  -b "ou=users,dc=example,dc=com" \
  "(cn=testuser)"
```

Should return the user entry.

### Step 5: Login

- Username: `testuser` (NOT the email!)
- Password: `Test123!`

---

## Troubleshooting

### If Still No LDAP Debug Logs

1. **Verify server was restarted** - Changes only apply after restart
2. **Check API server process logs** - Look for `[API DEBUG]` messages
3. **Verify auth-type is ldap** - `--auth-type ldap` must be set
4. **Check auth-options format** - Must be valid JSON array

### If LDAP Config Not Present

The `[API DEBUG]` logs will show:
```
[API DEBUG] NO LDAP configuration found in req.options!
```

This means the config isn't being passed. Verify:
- You're using `stf local` (not separate API server)
- You have `--auth-type ldap`
- You have `--auth-options` with LDAP parameters

---

## Quick Test Commands

**1. Create user:**
```bash
# Via UI: Settings → Users → [+] button
# Or via curl (see above)
```

**2. Check logs:**
```bash
# Look for [API DEBUG] and [LDAP DEBUG] in console
```

**3. Verify in LDAP:**
```bash
ldapsearch -x -H ldap://localhost:389 -D "cn=admin,dc=example,dc=com" -w admin -b "ou=users,dc=example,dc=com" "(cn=testuser)"
```

**4. Login:**
- Username: `testuser`
- Password: `Test123!`

---

## Expected Flow

1. Restart STF ✅
2. Create user → See `[API DEBUG]` logs ✅
3. See `[LDAP DEBUG]` logs showing user creation ✅
4. User exists in LDAP ✅
5. Can login with username/password ✅

---

## If It Works

You'll see:
- ✅ `[API DEBUG] LDAP config present:`
- ✅ `[LDAP DEBUG] User created successfully in LDAP`
- ✅ User exists in LDAP
- ✅ Can login

Then you can remove the debug logs if you want!

