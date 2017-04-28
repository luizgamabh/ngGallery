;(function () {
  'use strict';

  angular.module('itsGallery')
    .provider('itsGalleryConfig', itsGalleryConfigProvider)

  function itsGalleryConfigProvider() {
    this.config = {
      thumbnails: true,
      thumbnailSize: 60,
      leftEdge: 100,
      rightEdge: 100,
      beforeOpen: angular.noop,
      beforeClose: angular.noop,
      afterOpen: angular.noop,
      afterClose: angular.noop
    };

    /**
     * Seta callbacks para serem disparados antes de determinados eventos do slider
     * @param event
     * @param callback
     * @return {itsGalleryConfigProvider}
     */
    this.before = function (event, callback) {
      if (event === 'open') {
        this.config.beforeOpen = callback;
      } else if (event === 'close') {
        this.config.beforeClose = callback;
      }
      return this;
    }

    /**
     * Seta callbacks para serem disparados após determinados eventos do slider
     * @param event
     * @param callback
     * @return {itsGalleryConfigProvider}
     */
    this.after = function (event, callback) {
      if (event === 'open') {
        this.config.afterOpen = callback;
      } else if (event === 'close') {
        this.config.afterClose = callback;
      }
      return this;
    };

    /**
     * @return {itsGalleryConfigProvider}
     */
    this.enableThumbnail = function () {
      this.config.thumbnails = true;
      return this;
    };

    /**
     * @return {itsGalleryConfigProvider}
     */
    this.disableThumbnail = function() {
      this.config.thumbnails = false;
      return this;
    };

    /**
     * @return {itsGalleryConfigProvider}
     */
    this.$get = function () {
      return this;
    };
  }
})();
