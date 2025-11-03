var util = require('util')

var ldap = require('ldapjs')
var Promise = require('bluebird')

function InvalidCredentialsError(user) {
  Error.call(this, util.format('Invalid credentials for user "%s"', user))
  this.name = 'InvalidCredentialsError'
  this.user = user
  Error.captureStackTrace(this, InvalidCredentialsError)
}

util.inherits(InvalidCredentialsError, Error)

// Export
module.exports.InvalidCredentialsError = InvalidCredentialsError

// Export
module.exports.login = function(options, username, password) {
  function tryConnect() {
    var resolver = Promise.defer()
    var client = ldap.createClient({
          url: options.url
        , timeout: options.timeout
        , maxConnections: 1
        })

    if (options.bind.dn) {
      client.bind(options.bind.dn, options.bind.credentials, function(err) {
        if (err) {
          resolver.reject(err)
        }
        else {
          resolver.resolve(client)
        }
      })
    }
    else {
      resolver.resolve(client)
    }

    return resolver.promise
  }

  function tryFind(client) {
    var resolver = Promise.defer()
    var query = {
          scope: options.search.scope
        , filter: new ldap.AndFilter({
            filters: [
              new ldap.EqualityFilter({
                attribute: 'objectClass'
              , value: options.search.objectClass
              })
            , new ldap.EqualityFilter({
                attribute: options.search.field
              , value: username
              })
            ]
          })
        }

    if (options.search.filter) {
      var parsedFilter = ldap.parseFilter(options.search.filter)
      query.filter.filters.push(parsedFilter)
    }

    client.search(options.search.dn, query, function(err, search) {
      if (err) {
        return resolver.reject(err)
      }

      function entryListener(entry) {
        resolver.resolve(entry)
      }

      function endListener() {
        resolver.reject(new InvalidCredentialsError(username))
      }

      function errorListener(err) {
        resolver.reject(err)
      }

      search.on('searchEntry', entryListener)
      search.on('end', endListener)
      search.on('error', errorListener)

      resolver.promise.finally(function() {
        search.removeListener('searchEntry', entryListener)
        search.removeListener('end', endListener)
        search.removeListener('error', errorListener)
      })
    })

    return resolver.promise
  }

  function tryBind(client, entry) {
    return new Promise(function(resolve, reject) {
      client.bind(entry.object.dn, password, function(err) {
        if (err) {
          reject(new InvalidCredentialsError(username))
        }
        else {
          resolve(entry.object)
        }
      })
    })
  }

  return tryConnect().then(function(client) {
    return tryFind(client)
      .then(function(entry) {
        return tryBind(client, entry)
      })
      .finally(function() {
        client.unbind()
      })
  })
}

// Export
module.exports.email = function(user) {
  return user.mail || user.email || user.userPrincipalName
}

// Export
module.exports.createUser = function(options, username, name, email, password) {
  return new Promise(function(resolve, reject) {
    var client = ldap.createClient({
      url: options.url
    , timeout: options.timeout
    , maxConnections: 1
    })

    // First, bind with admin credentials to have permission to create users
    client.bind(options.bind.dn, options.bind.credentials, function(err) {
      if (err) {
        client.unbind()
        return reject(new Error('Failed to bind with LDAP admin credentials: ' + err.message))
      }

      // Construct the DN for the new user
      // Format: cn={username},{searchDn}
      var userDn = 'cn=' + username + ',' + options.search.dn

      // Create the user entry
      var entry = {
        cn: username
      , sn: name || username
      , mail: email
      , objectClass: [options.search.objectClass, 'organizationalPerson', 'person']
      , userPassword: password
      }

      // Add the user to LDAP
      client.add(userDn, entry, function(err) {
        client.unbind()
        if (err) {
          // Check if user already exists
          if (err.code === 68) { // LDAP_ENTRY_ALREADY_EXISTS
            return reject(new Error('User already exists in LDAP'))
          }
          return reject(new Error('Failed to create user in LDAP: ' + err.message))
        }
        resolve(true)
      })
    })
  })
}
