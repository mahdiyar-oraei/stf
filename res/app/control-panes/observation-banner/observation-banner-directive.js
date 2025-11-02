module.exports = function ObservationBannerDirective() {
  return {
    restrict: 'E'
  , template: require('./observation-banner.pug')
  , scope: {
      observeMode: '='
    }
  , link: function(scope, element) {
      scope.$watch('observeMode', function(newValue) {
        if (newValue) {
          // Add class to body to disable interactions globally
          document.body.classList.add('observation-mode')
        } else {
          document.body.classList.remove('observation-mode')
        }
      })

      scope.$on('$destroy', function() {
        document.body.classList.remove('observation-mode')
      })
    }
  }
}

