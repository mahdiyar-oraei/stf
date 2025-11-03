require('./device-assignment.css')

module.exports = angular.module('stf.settings.device-assignment', [
  require('stf/common-ui').name,
  require('stf/device').name,
  require('stf/user').name,
  require('stf/components/stf/device-assignment').name
])
  .run(['$templateCache', function($templateCache) {
    $templateCache.put(
      'settings/device-assignment/device-assignment.pug', require('./device-assignment.pug')
    )
  }])
  .controller('DeviceAssignmentCtrl', require('./device-assignment-controller'))

