module.exports = function DeviceAssignmentServiceFactory($http) {
  var DeviceAssignmentService = {}

  DeviceAssignmentService.assignDevice = function(serial, email) {
    return $http({
      method: 'PUT',
      url: '/api/v1/devices/' + serial + '/assign',
      data: {
        email: email
      }
    })
  }

  DeviceAssignmentService.unassignDevice = function(serial) {
    return $http({
      method: 'DELETE',
      url: '/api/v1/devices/' + serial + '/assign'
    })
  }

  DeviceAssignmentService.getAssignedDevices = function(email) {
    return $http({
      method: 'GET',
      url: '/api/v1/devices/assigned/' + email
    })
  }

  DeviceAssignmentService.observeDevice = function(serial) {
    return $http({
      method: 'GET',
      url: '/api/v1/user/devices/' + serial + '/observe'
    })
  }

  return DeviceAssignmentService
}

