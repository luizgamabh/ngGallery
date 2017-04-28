/*TODO --- BEGIN ---

  MELHORIAS:
  1. Remover jQuery da diretiva. No serviço já não está usando
  2. Definir opções no provider, como nomes de classe css, etc
  3. Permitir a criação de temas, setando theme_name (classe pai no css) no provider e/ou na diretiva

  FIXES:


  TODO ---  END  ---*/
;(function ($) {
  'use strict';

  angular.module('itsGallery')
    .directive('itsGallery', itsGalleryDirective);

  itsGalleryDirective.$inject = ['itsGallery', '$timeout', 'itsGalleryConfig'];

  function itsGalleryDirective(itsGallery, $timeout, itsGalleryConfig) {
    return {
      restrict: 'A',
      scope: {
        file: '=?',
        level: '@?',
        thumbnail: '@?',
        mosaic: '@?',
        prepend: '=?',
        selector: '@?',
        attribute: '@?',
        source: '@?',
        actions: '=?',
        actionsPromise: '=?',
        fileParams: '=?',
        fileAdditionalParams: '=?',
        isolated: '@?'
      },
      link: function (scope, el, attrs) {
        $timeout(function() {

          var $el = $(el);

          var thumbnailsEnabled = itsGalleryConfig.config.thumbnails;
          // if (thumbnailsEnabled && !scope.thumbnail && !scope.file.hasOwnProperty('thumbnailUrl')) {
          //   throw new Error('Thumbnail required. If you don\'t want to use thumbs, please disable this option on provider.');
          // }

          // Generates Unique id
          var uid = 'itsGallery-' + Math.floor((1 + Math.random()) * eval(0x10000000000)).toString(16).substring(1) + '_' + (+ new Date);

          // Isolating the directive
          var isolated = scope.isolated || 'general';
          var instance = itsGallery.new(isolated);

          // Target
          var level = scope.level || 0;
          var $target = level === 0 ? $el : $el.parents().eq(level - 1);

          // Record uid into target
          scope.file.uid = uid;

          // Source
          var src = '', sources;
          if (scope.source) {
            src = scope.source;
            sources = src.split('-----or-----');
          } else {
            var selector = scope.selector || '.contents';
            var attribute = scope.attribute || 'href';
            src = $target.find(selector).attr(attribute);
            sources = src.split('-----or-----');
          }

          var thumbnailUrl = thumbnailsEnabled ?
            scope.thumbnail ? scope.thumbnail :
              scope.file.hasOwnProperty('thumbnailUrl') ? scope.file.thumbnailUrl :
                scope.file.src : '';

          var mosaicUrl = thumbnailsEnabled ?
            scope.mosaic ? scope.mosaic :
              scope.file.hasOwnProperty('mosaic') ? scope.file.mosaic :
                scope.file.src : thumbnailUrl;

          // File parameters
          var id = $el.data('id') || $target.data('id');
          var fileParams = angular.extend({}, {
            uid: uid,
            id: id,
            src: sources,
            subHtml: '',
            thumbnailUrl: thumbnailUrl,
            mosaicUrl: mosaicUrl
          }, (scope.fileParams || {}), (scope.fileAdditionalParams || {}));

          if (scope.prepend) {
            instance.prepend(fileParams);
          } else {
            instance.append(fileParams);
          }

          // Actions
          var actions;
          if (!scope.actionsPromise) {
            actions = scope.actions || [];
            initilize();
          } else {
            scope.actions().then(function(response){
              actions = response;
              initilize();
            });
          }

          function initilize() {
            $target.on('click', function (event) {
              // Resolve o conflito com o menu de contexto
              if (event.target.matches('.ng-context-menu__circle,.ng-context-menu__arrow')) {
                event.stopPropagation();
                return;
              }

              event.preventDefault();
              var idx = instance.getIndex(scope.file.uid);
              instance.fire(null, idx, actions);
            });
          }
          scope.$on('$destroy', function () {
            uid = scope.file.uid || uid;
            $el.parent().off('click');
            instance.removeById(uid).then(function(uid){
              console.log('Diretiva destruída!', uid);
            });
            //instance.destroy(); // TODO: Checar necessidade
          });
        });

      }
    }
  }

})(jQuery);
