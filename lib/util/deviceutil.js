/**
* Copyright © 2019 contains code contributed by Orange SA, authors: Denis Barbaron - Licensed under the Apache license 2.0
**/

var logger = require('./logger')

var log = logger.createLogger('util:deviceutil')

var deviceutil = module.exports = Object.create(null)

deviceutil.isOwnedByUser = function(device, user) {
  return device.present &&
         device.ready &&
         device.owner &&
         (device.owner.email === user.email || user.privilege === 'admin') &&
         device.using
}

deviceutil.isAddable = function(device, user) {
  // Check if device is assigned to someone
  if (device.assignedUser) {
    // Only the assigned user can add this device (unless admin for observation)
    if (device.assignedUser !== user.email) {
      return false
    }
  }
  
  return device.present &&
         device.ready &&
         !device.using &&
         !device.owner
}

deviceutil.canObserve = function(device, user) {
  // Only admins can observe devices
  if (user.privilege !== 'admin') {
    return false
  }
  
  // Can observe if device is in use by someone else
  return device.present &&
         device.ready &&
         device.using &&
         device.owner &&
         device.owner.email !== user.email
}
