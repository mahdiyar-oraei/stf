module.exports = function DeviceAssignmentCtrl(
  $scope,
  $uibModal,
  DeviceAssignmentService,
  DevicesService,
  UsersService,
  CommonService
) {
  $scope.devices = []
  $scope.users = []
  $scope.deviceSearch = ''
  $scope.userSearch = ''
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
    UsersService.getUsers('email,name').then(function(response) {
      if (response.data.success) {
        $scope.users = response.data.users
      }
    })
    .catch(function(error) {
      CommonService.notify('Failed to load users: ' + (error.data ? error.data.description : error.message), 'danger')
    })
  }

  // Get count of devices assigned to a user
  $scope.getUserDeviceCount = function(email) {
    return ($scope.deviceAssignments[email] || []).length
  }

  // Show assignment modal using Angular UI Bootstrap
  $scope.showAssignModal = function(device) {
    var modalInstance = $uibModal.open({
      template: require('./device-assignment-modal.pug'),
      controller: function($scope, $uibModalInstance, device, users) {
        $scope.device = device
        $scope.users = users
        $scope.selectedUser = ''
        
        $scope.ok = function() {
          if ($scope.selectedUser) {
            $uibModalInstance.close($scope.selectedUser)
          }
        }
        
        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel')
        }
      },
      resolve: {
        device: function() {
          return device
        },
        users: function() {
          return $scope.users
        }
      }
    })
    
    modalInstance.result.then(function(selectedUserEmail) {
      // User clicked Assign
      DeviceAssignmentService.assignDevice(device.serial, selectedUserEmail)
        .then(function(response) {
          if (response.data.success) {
            // Update local state
            device.assignedUser = selectedUserEmail
            if (!$scope.deviceAssignments[selectedUserEmail]) {
              $scope.deviceAssignments[selectedUserEmail] = []
            }
            $scope.deviceAssignments[selectedUserEmail].push(device.serial)
            CommonService.notify('Device assigned successfully', 'success')
          }
        })
        .catch(function(error) {
          CommonService.notify('Failed to assign device: ' + (error.data ? error.data.description : error.message), 'danger')
        })
    }, function() {
      // User cancelled
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

