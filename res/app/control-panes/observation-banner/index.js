require('./observation-banner.css')

module.exports = angular.module('stf.observation-banner', [])
  .directive('observationBanner', require('./observation-banner-directive'))

