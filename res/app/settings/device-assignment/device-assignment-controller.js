module.exports = function DeviceAssignmentCtrl(
  $scope,
  $http,
  DeviceAssignmentService,
  DevicesService,
  UsersService,
  CommonService
) {
  $scope.devices = []
  $scope.users = []
  $scope.deviceSearch = ''
  $scope.userSearch = ''
  $scope.selectedDevice = null
  $scope.selectedUser = ''
  $scope.deviceAssignments = {}

  // Load all devices
  function loadDevices() {
    DevicesService.getDevices('origin', '').then(function(response) {
      if (response.data.success) {
        $scope.devices = response.data.devices
        // Build assignment map
        $scope.devices.forEach(function(device) {
          if (device.assignedUser) {
            if (!$scope.deviceAssignments[device.assignedUser]) {
              $scope.deviceAssignments[device.assignedUser] = []
            }
            $scope.deviceAssignments[device.assignedUser].push(device.serial)
          }
        })
      }
    })
    .catch(function(error) {
      CommonService.notify('Failed to load devices: ' + (error.data ? error.data.description : error.message), 'danger')
    })
  }

  // Load all users
  function loadUsers() {
    UsersService.getUsers().then(function(response) {
      if (response.data.success) {
        $scope.users = response.data.users
      }
    })
  }

  // Get count of devices assigned to a user
  $scope.getUserDeviceCount = function(email) {
    return ($scope.deviceAssignments[email] || []).length
  }

  // Show assignment modal
  $scope.showAssignModal = function(device) {
    $scope.selectedDevice = device
    $scope.selectedUser = ''
    angular.element('#assignmentModal').modal('show')
  }

  // Confirm assignment
  $scope.confirmAssignment = function() {
    if (!$scope.selectedUser || !$scope.selectedDevice) {
      return
    }

    DeviceAssignmentService.assignDevice($scope.selectedDevice.serial, $scope.selectedUser)
      .then(function(response) {
        if (response.data.success) {
          // Update local state
          $scope.selectedDevice.assignedUser = $scope.selectedUser
          if (!$scope.deviceAssignments[$scope.selectedUser]) {
            $scope.deviceAssignments[$scope.selectedUser] = []
          }
          $scope.deviceAssignments[$scope.selectedUser].push($scope.selectedDevice.serial)
          
          angular.element('#assignmentModal').modal('hide')
          CommonService.notify('Device assigned successfully', 'success')
        }
      })
      .catch(function(error) {
        CommonService.notify('Failed to assign device: ' + (error.data ? error.data.description : error.message), 'danger')
      })
  }

  // Unassign device
  $scope.unassignDevice = function(serial) {
    if (!confirm('Are you sure you want to unassign this device?')) {
      return
    }

    DeviceAssignmentService.unassignDevice(serial)
      .then(function(response) {
        if (response.data.success) {
          // Update local state
          var device = $scope.devices.find(function(d) { return d.serial === serial })
          if (device && device.assignedUser) {
            var email = device.assignedUser
            if ($scope.deviceAssignments[email]) {
              var index = $scope.deviceAssignments[email].indexOf(serial)
              if (index > -1) {
                $scope.deviceAssignments[email].splice(index, 1)
              }
            }
            device.assignedUser = null
          }
          CommonService.notify('Device unassigned successfully', 'success')
        }
      })
      .catch(function(error) {
        CommonService.notify('Failed to unassign device: ' + (error.data ? error.data.description : error.message), 'danger')
      })
  }

  // Initialize
  loadDevices()
  loadUsers()
}

