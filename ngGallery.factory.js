// {
//   id: item.id,
//   author: item.authorName,
//   created: item.created,
//   src: $filter('thumb')(item.linkUrl, 1920, 1080, 'no-upscale'),
//   thumb: item.thumbnailUrl,
//   subHtml: "<h4>" + item.title + "</h4><p>" + item.mimeType + "</p>"
// }

;(function (window, document, Array, Object, CustomEvent, undefined) {

  var DEFAULT_INSTANCE = 'general';
  var CUSTOM_ANIMATION_TIME = 300;

  angular.module('itsGallery')
    .factory('itsGallery', itsGalleryFactory);

  itsGalleryFactory.$inject = ['itsGalleryConfig', '$q'];
  function itsGalleryFactory(itsGalleryConfig, $q) {

    // Instâncias da galeria
    var instances = {};

    // Eventos customizados
    var customEvents = _createCustomEvents();

    // Métodos do serviço
    return {
      destroy: destroy,
      new: firstOrCreate,
      firstOrCreate: firstOrCreate, // alias,
      dynamic: dynamic
    };

    /**
     * Destrói GERAL!!!!!
     */
    function destroy() {
      // console.group('Clearing any existing instances');
      for (var i in instances) {
        // console.log('Clearing ' + i);
        instances[i].destroy().then(function(){
          delete instances[i];
        });
      }
      // console.debug('Instances destroyed');
      // console.groupEnd();
    }

    /**
     * Cria uma nova instância ou obtém, caso o identificador já exista
     * @param identificator
     * @returns {*}
     */
    function firstOrCreate(identificator) {
      identificator = !!identificator ? identificator : DEFAULT_INSTANCE;
      if (instances.hasOwnProperty(identificator)) {
        return instances[identificator];
      } else {
        instances[identificator] = new Instance();
        return instances[identificator];
      }
    }

    /**
     * Cria o slider no DOM dentro da instancia general e retorna a instância
     * @param {Array|null} filesArray
     * @param {integer} startFromIndex
     * @param {function} startCallback
     * @param {function} endCallback
     * @param {Array} actions
     * @param {Object} options
     * @returns {*|ItsGallery}
     */
    function dynamic() {
      var instance = firstOrCreate();
      // var args = [].slice.call(arguments);
      instance.fire.apply(this, arguments);

      return instance;
    }

    /**
     * Cria eventos customizados
     * @returns {*|{beforeOpen: CustomEvent, afterOpen: CustomEvent, beforeClose: CustomEvent, afterClose: CustomEvent}}
     * @private
     */
    function _createCustomEvents() {
      return customEvents || {
          beforeOpen: new CustomEvent('beforeOpen'),
          afterOpen: new CustomEvent('afterOpen'),
          beforeClose: new CustomEvent('beforeClose'),
          afterClose: new CustomEvent('afterClose')
        };
    }

    /**
     * Construtor da instância da galeria
     * @constructor
     */
    function Instance() {
      // Variáveis de instância
      var _localFilesArray = []; // Arquivos
      var _gal; // Instância ItsGallery

      // Public methpds
      this.getIndex = getIndex;
      this.prepend = prepend;
      this.append = append;
      this.removeById = removeById;
      this.updateTitle = updateTitle;
      this.recent = recent;
      this.destroy = destroy;
      this.fire = fire;

      /**
       * Retorna o índice do elemento no array _localFilesArray
       * @param uid
       * @return
       */
      function getIndex(uid) {
        return _localFilesArray.findIndex(function (obj) {
          return obj.uid == uid;
        });
      }

      function prepend(fileParams) {
        _localFilesArray.unshift(fileParams);
        // increaseCount(fileParams.uid);
      }

      function append(fileParams) {
        _localFilesArray.push(fileParams);
      }

      function removeById(uid, doNotNavigate) {
        // Todo: Testar se array de arquivos está limpo, então destruir
        var deferred = $q.defer();
        var index = getIndex(uid);
        if (index !== -1) {
          _localFilesArray.splice(index, 1);
          _gal && _gal.removeThumbnail(uid);
          if (!doNotNavigate) {
            _gal && _gal.prev(true);
          }
          deferred.resolve(uid);
        } else {
          deferred.reject(uid);
        }
        return deferred.promise;
      }

      function updateTitle(index, title) {
        var idx = typeof index === 'number' ? index : getIndex(index);
        if (angular.isDefined(_localFilesArray[idx])) {
          _localFilesArray[idx].title = title;
          _localFilesArray[idx].subHtml = _localFilesArray[idx].subHtml.replace(/<h4>(.*?)(\.\w+)?<\/h4>/img, "<h4>" + title + "$2</h4>");
          var caption = document.querySelector('.its-slider__caption');
          if (caption) {
            caption.innerHTML = _localFilesArray[idx].subHtml;
          }
        }
      }

      function recent(index) {
        var idx = typeof index === 'number' ? index : getIndex(index);
        if (angular.isDefined(_localFilesArray[idx])) {
          _localFilesArray.unshift(_localFilesArray.splice(idx, 1)[0]);
          _gal.navigate(-Infinity);
        }
      }

      function destroy(uid) {
        var deferred = $q.defer();
        if (!uid) {
          _gal && _gal.destroy();
          _localFilesArray = [];
          deferred.resolve(_localFilesArray);
        } else {

        }
        return deferred.promise;
      }

      /**
       * Cria o slider no DOM
       * @param {Array|null} filesArray
       * @param {integer} startFromIndex
       * @param {function} startCallback
       * @param {function} endCallback
       * @param {Array} actions
       * @param {Object} options
       * @returns {*|ItsGallery}
       */
      function fire(filesArray, startFromIndex) {
        startFromIndex = startFromIndex >>> 0;
        if (filesArray instanceof Array) {
          console.log('é array');
          _localFilesArray = filesArray; // Gravamos os arquivos na variável de instância
          filesArray = undefined; // Não precisamos da variável, então removemos da memória
        }
        if (_localFilesArray.length === 0) { // Se o array de arquivos estiver vazio, interrompemos
          return void 0;
        }
        // Tratando os demais possíveis argumentos (startCallback, endCallback)
        var args = [].slice.call(arguments).splice(2);
        var startCallback, endCallback, actions = [];
        for (var j = 0, i = 0; i < args.length; i++) {
          if (typeof args[i] === 'function') {
            if (j++ === 0) {
              startCallback = args[i];
            } else {
              endCallback = args[i];
            }
          } else if (Array.isArray(args[i])) {
            actions = args[i];
          }
        }
        actions = actions || [];
        if (_gal) {
          _gal.destroy();
        }
        _gal = new ItsGallery(_localFilesArray, startFromIndex, endCallback, actions);
        if (typeof startCallback === 'function') {
          startCallback();
        }
        _gal.open();
        // console.log(_gal);
        // console.log(this);
        return _gal;
      }

      /**
       * Construtor da classe ItsGallery
       * @param objectsArray
       * @param startFromIndex
       * @param endCallback
       * @param actions
       * @constructor
       */
      function ItsGallery(objectsArray, startFromIndex, endCallback, actions) {
        var _this = this;
        // var preload = itsGalleryConfig.config.preload;
        var bodyElement = document.body, docElement = window.document.documentElement;
        var disabled = false;
        var frozenThumbs = false;
        var thumbsLoaded = false;
        startFromIndex = startFromIndex >>> 0;
        _this.open = open;
        _this.destroy = destroy;
        _this.prev = prev;
        _this.next = next;
        _this.navigate = navigate;
        _this.removeThumbnail = removeThumbnail;

        function open() {
          itsGalleryConfig.config.beforeOpen();
          docElement.dispatchEvent(customEvents.beforeOpen);
          generateStructure(actions, objectsArray.length).then(function (structure) {
            docElement.addEventListener('keyup', enableKeys);
            _this.structure = structure;
            _this.structure.close_btn.addEventListener('click', _this.destroy);
            if (objectsArray.length > 1) {
              _this.structure.prev.addEventListener('click', _this.prev);
              _this.structure.next.addEventListener('click', _this.next);
            }
            // if (itsGalleryConfig.config.thumbnails) {
            //   generateThumbsNavigation();
            // }
            loadCurrentMedia();
            itsGalleryConfig.config.afterOpen();
            docElement.dispatchEvent(customEvents.afterOpen);
          }, function (structure) {
            // A estrutura já existia
          });
        }

        function enableKeys(e) {
          // Esquerda
          if (e.keyCode == "37") navigate(-1);
          // Direia
          else if (e.keyCode == "39") navigate(1);
          // Esc
          else if (e.keyCode == "27") navigate(0);
        }

        /**
         * Carrega a imagem atual
         */
        function loadCurrentMedia() {
          _this.structure.ring.style.display = 'block';
          var currentFile = objectsArray[startFromIndex];
          var type = checkTypeByExtension(currentFile);
          mediaHandler(type, currentFile);
        }

        function mediaHandler(type, currentFile) {
          // console.log(type, currentFile);
          if (type === 'image') {
            return imageHandler(currentFile);
          } else if (type === 'audio') {
            return audioHandler(currentFile);
          } else if (type === 'video') {
            return videoHandler(currentFile);
          }
        }

        var video_deferred, video_timeout;

        function videoHandler(currentFile) {
          cancelAll();
          video_deferred = $q.defer();
          var currentVideo = document.createElement('video');
          currentVideo.src = typeof currentFile.src === 'string' ? currentFile.src : currentFile.src[0];
          currentVideo.setAttribute('controls', '');
          currentVideo.setAttribute('preload', 'metadata');
          currentVideo.style.visibility = 'hidden';
          _this.structure.caption.innerHTML = currentFile.subHtml;
          _this.structure.canvas.innerHTML = '';
          _this.structure.canvas.append(currentVideo);
          currentVideo.onloadedmetadata = function () {
            if (itsGalleryConfig.config.thumbnails && !thumbsLoaded) {
              generateThumbsNavigation();
            }
            var w = currentVideo.videoWidth,
              h = currentVideo.videoHeight;
            var canvasMetrics = calcCanvasSize(w, h);
            _this.structure.canvas.style.width = canvasMetrics.w + 'px';
            _this.structure.canvas.style.height = canvasMetrics.h + 'px';
            if (video_timeout) {
              clearTimeout(video_timeout);
              video_timeout = false;
            }
            video_timeout = setTimeout(function () {
              disabled = false;
              _this.structure.ring.style.display = 'none';
              currentVideo.style.visibility = 'visible';
            }, CUSTOM_ANIMATION_TIME);
          };

          video_deferred.resolve(currentVideo);
          return video_deferred.promise;
        }

        var audio_deferred, audio_timeout;

        function audioHandler(currentFile) {
          cancelAll();
          if (itsGalleryConfig.config.thumbnails && !thumbsLoaded) {
            generateThumbsNavigation();
          }
          audio_deferred = $q.defer();
          var currentAudio = new Audio(currentFile.src);
          currentAudio.src = typeof currentFile.src === 'string' ? currentFile.src : currentFile.src[0];
          currentAudio.setAttribute('controls', 'true');
          currentAudio.setAttribute('preload', 'metadata');
          currentAudio.style.visibility = 'hidden';
          _this.structure.caption.innerHTML = currentFile.subHtml;
          _this.structure.canvas.innerHTML = '';
          _this.structure.canvas.append(currentAudio);
          var w = 300, h = 32;//, box = currentAudio.getBoundingClientRect(); w = box.width; h = box.height;
          var canvasMetrics = calcCanvasSize(w, h);
          _this.structure.canvas.style.width = canvasMetrics.w + 'px';
          _this.structure.canvas.style.height = canvasMetrics.h + 'px';

          if (audio_timeout) {
            clearTimeout(audio_timeout);
            audio_timeout = false;
          }
          audio_timeout = setTimeout(function () {
            disabled = false;
            _this.structure.ring.style.display = 'none';
            currentAudio.style.visibility = 'visible';
          }, CUSTOM_ANIMATION_TIME);

          audio_deferred.resolve(currentAudio);
          return audio_deferred.promise;
        }

        var img_deferred, img_timeout;

        function generateLink(currentFile, w, h) {
          if (_this.structure.externalLink) {
            _this.structure.externalLink.parentNode.removeChild(_this.structure.externalLink);
            _this.structure.externalLink = false;
          }
          if (currentFile.hasOwnProperty('externalLinkUrl')) {
            console.log(currentFile.externalLinkUrl);
            _this.structure.externalLink = document.createElement('a');
            _this.structure.externalLink.classList.add('its-slider__external-link');
            _this.structure.externalLink.innerHTML = '<div>' + currentFile.externalLinkName + '</div>';
            _this.structure.externalLink.style.width = w + 'px';
            _this.structure.externalLink.style.height = h + 'px';
            //Corrige links inválidos:
            currentFile.externalLinkUrl = currentFile.externalLinkUrl.replace(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, "mailto:$&");
            console.log(currentFile.externalLinkUrl);
            if (currentFile.externalLinkUrl.indexOf('@')===-1 && !/.*?:\/\//g.test(currentFile.externalLinkUrl)) {
              currentFile.externalLinkUrl = 'http://' + currentFile.externalLinkUrl;
            }
            _this.structure.externalLink.setAttribute('href', currentFile.externalLinkUrl);
            _this.structure.externalLink.setAttribute('target', '_blank');
            var info = currentFile.hasOwnProperty('dataInfo') ? '(' + currentFile.dataInfo + ')' : '';
            if (currentFile.hasOwnProperty('download') && currentFile.download) {
              _this.structure.externalLink.setAttribute('download', currentFile.download);
            }
            _this.structure.externalLink.setAttribute('data-rel', info);
            _this.structure.backdrop.append(_this.structure.externalLink);
          }
          // currentFile
          // _this.structure.canvas
        }

        function imageHandler(currentFile) {
          cancelAll();
          var src = Array.isArray(currentFile.src) ? currentFile.src : [currentFile.src];
          img_deferred = $q.defer();
          var currentImage = new Image();
          var count = 0;
          currentImage.onload = function () {
            if (itsGalleryConfig.config.thumbnails && !thumbsLoaded) {
              generateThumbsNavigation();
            }
            var canvasMetrics = calcCanvasSize(this.width, this.height);

            generateLink(currentFile, canvasMetrics.w, canvasMetrics.h);

            _this.structure.canvas.style.width = canvasMetrics.w + 'px';
            _this.structure.canvas.style.height = canvasMetrics.h + 'px';
            _this.structure.caption.style.display = 'block';
            _this.structure.caption.innerHTML = currentFile.subHtml;

            _this.structure.canvas.innerHTML = '';
            var _that = this;
            if (img_timeout) {
              clearTimeout(img_timeout);
              img_timeout = false;
            }
            img_timeout = setTimeout(function () {
              _this.structure.canvas.append(_that);
              disabled = false;
            }, CUSTOM_ANIMATION_TIME);
            _this.structure.ring.style.display = 'none';
            img_deferred.resolve(currentImage);
          };
          currentImage.onerror = function (error) {
            if (src.length >= count) {
              currentImage.src = src[count++];
            } else {
              _this.structure.ring.style.display = 'none';
              currentImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAMAAAANIilAAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkU4MDMxMEY5MDI3NjExRTc5MUVEOTNGRDk4M0ZGRDVBIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkU4MDMxMEZBMDI3NjExRTc5MUVEOTNGRDk4M0ZGRDVBIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RTgwMzEwRjcwMjc2MTFFNzkxRUQ5M0ZEOTgzRkZENUEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RTgwMzEwRjgwMjc2MTFFNzkxRUQ5M0ZEOTgzRkZENUEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4Ffj6KAAAAolBMVEX/////3WdQUVF+f39hYmK7u7tmTifj4+PQ0ND29vb/99+wsLBwcXGYmZmzp5OMcTeMjIz/33PZ08rZuVf/5pWylUft7e311GPFxcWfgz//+efsy1+Mel3/4X//+++Vejv/6qn/6J///fekpKTFp0/QyLz/5Ir/7rypnIa8nkv29fL/886CaDOpjEP/9de8sqHPsFPa2tr/8MXiwlt5Xy9vVivOMEcvAAABxklEQVR42uyU6XaCMBCFQwggCgJCBQTc973avv+rdZJACVV7En9zzxFzdb5kMhOCUKtW76u7iUCb7hvoodBKFQdFdLzWBK3HKuwo0BoKRvLsvND+qJhLwzPtQTPpMrPwMOZYFrIv2aJPITY+miajQtM80mmmknDAGXNC4YnJZwkUsr4Dk9JBCoO7fN58y0svZZuOU2+pqcIPUoGz3cljOu0yRTj28stgT91+cMm9WL5XrMbiD6zu8gfMM7f9X21NT/6InWmDVrVf0aadZc9npGXfeX9Qqp9/ZVqk9EaG149S11Dtney+1+Snt4HKuuw+mNbsdK58A45vESwfRLcxatUKuRgnCHUc7NtIxxgbCCWYGkFDrMPDx45VGa4exGPLJvB0GYwtiz57ImzQePqnUxkun9gGNj4h2CFIJ7Cq0cEL5Bgi7EC8DR8XW9yUgvgOjTfoiBsLG82ddTCDXUjT4uYFDGmghTNswL5DapiZpzDbM0ILYgksZFLD3LyAScLKSIS1e8SuYW5epF2VyK1hlo9ewty8qDbrRWIT8gizajfgZp8J3yM1kAxdiE9ChD6jOu3mCeOh9IQNH+DqhIlwq1b/6UeAAQDQhBsEor8+vgAAAABJRU5ErkJggg==';
              disabled = false;
              img_deferred.reject(error);
            }
          };
          currentImage.src = src[count++]; // Pega o primeiro item do array de imagens
          return img_deferred.promise;
        }

        function cancelAll() {
          if (audio_deferred) {
            audio_deferred.resolve();
          }
          if (video_deferred) {
            video_deferred.resolve();
          }
          if (img_deferred) {
            img_deferred.resolve();
          }
          if (audio_timeout) {
            clearTimeout(audio_timeout);
          }
          if (video_timeout) {
            clearTimeout(video_timeout);
          }
          if (img_timeout) {
            clearTimeout(img_timeout);
          }
        }

        function end(event) {
          if (event.target.classList.contains('its-slider__backdrop')) {
            navigate(0);
          }
        }

        function checkTypeByExtension(file) {
          var curFile = typeof file.src === 'string' ? file.src : file.src[0];
          var idx, ext = (idx = curFile.lastIndexOf('.')) !== -1 ? curFile.substr(idx + 1) : false;
          if (!ext) return false;
          switch (ext) {
            case 'mp3': case 'ogg':
              return 'audio';
              break;
            case 'mp4': case 'avi': case 'mpeg': case 'mov':
              return 'video';
              break;
            case 'jpg': case 'jpeg': case 'bmp': case 'png': case 'gif': case 'postit': default:
              return 'image';
              break;
          }
        }

        function callbackDelegate(func) {
          return function () {
            var object = objectsArray[startFromIndex];
            typeof func === 'function' && func(object);
          }
        }


        /* Thumbnails */

        /**
         * Variables
         */
        var mosaicAction, thumbs_wrapper, wrapper;
        var size = 0;
        var images = [];
        var leftEdge = itsGalleryConfig.config.leftEdge >>> 0;
        var rightEdge = itsGalleryConfig.config.rightEdge >>> 0;

        /**
         * Gera os thumbnails
         */
        function generateThumbsNavigation(regenerate) {
          thumbsLoaded = true;
          mosaicAction = document.createElement('div');
          thumbs_wrapper = document.createElement('div');
          wrapper = document.createElement('div');
          thumbs_wrapper.append(wrapper);
          _this.structure.thumbnails.innerHTML = '';
          // <div class="its-slider__action" title="Adicionar aos arquivos recentes"><i class="icon-Star"></i></div>
          thumbs_wrapper.classList.add('thumbnails__wrapper');
          _this.structure.thumbnails_wrapper = wrapper;
          mosaicAction.classList.add('its-slider__action');
          mosaicAction.setAttribute('title', 'Expandir');
          mosaicAction.innerHTML = '<i class="icon-ArrowUp"></i>';
          mosaicAction.onclick = mosaicHandler;
          _this.structure.bl.append(mosaicAction);
          _this.structure.thumbnails.append(thumbs_wrapper);
          thumbs_wrapper.scrollLeft = 0;
          thumbs_wrapper.onmousemove = mousemove;
          updateThumbs();
        }

        /**
         * Atualiza as thumbs de acordo com objectsArray
         */
        function updateThumbs() {
          wrapper.innerHTML = '';
          size = 0;
          for (var i = 0; i < objectsArray.length; i++) {
            if (objectsArray[i].hasOwnProperty('thumbnailUrl')) {
              var thumbnailUrl = objectsArray[i].thumbnailUrl;
              var mosaicUrl = objectsArray[i].hasOwnProperty('mosaicUrl') ? objectsArray[i].mosaicUrl : thumbnailUrl;
              var link = document.createElement('a');
              var info = document.createElement('div');
              info.classList.add('thumb-info');
              info.innerHTML = objectsArray[i].subHtml.replace(/\s-\s([\d\/\s:]*<\/p>)/, "<br>$1");
              link.setAttribute('href', '');
              link.setAttribute('data-index', i);
              // link.setAttribute('data-info', objectsArray[i].subHtml);
              link.setAttribute('data-uid', objectsArray[i].uid);
              link.onclick = function(event) {
                event.preventDefault();
                var uid = this.getAttribute('data-uid');
                navigateTo(uid);
                mosaicHandler(true);
              };
              var img = new Image();
              img.src = thumbnailUrl;
              img.setAttribute('data-thumb', thumbnailUrl);
              img.setAttribute('data-mosaic', mosaicUrl);
              images.push(img);
              link.append(img);
              link.append(info);
              size += itsGalleryConfig.config.thumbnailSize;
              wrapper.append(link);
            }
            wrapper.style.width = size + 'px';
          }
        }

        /**
         * Controla o comportamento para o evento de mousemove nas thumbs
         * @param e
         */
        function mousemove(e) {
          if (!frozenThumbs) {
            var xPos = e.pageX - (thumbs_wrapper.getBoundingClientRect().left + document.body.scrollLeft) - leftEdge;
            var xMax = thumbs_wrapper.clientWidth - rightEdge;
            if (xPos > 0 && xPos < xMax) {
              var perc = xPos / (xMax - leftEdge);
              var scrollPos = wrapper.offsetWidth - thumbs_wrapper.clientWidth;
              thumbs_wrapper.scrollLeft = perc * scrollPos;
            } else {
              thumbs_wrapper.scrollLeft = 0;
            }
          }
        }

        /**
         * Mosaic hander
         * @param event
         */
        function mosaicHandler(event) {
          var closeOnly = typeof event === 'boolean' ? !!event : false;
          if (!_this.structure.footer.classList.contains('mosaic')) {
            if (!closeOnly) {
              _this.structure.footer.classList.add('mosaic');
              wrapper.style.width = 'auto';
              mosaicAction.innerHTML = '<i class="icon-ArrowDown"></i>';
              images.map(function(img) {
                return img.src = img.dataset.mosaic;
              });
              frozenThumbs = true;
            } else {
              frozenThumbs = false;
            }
          } else {
            _this.structure.footer.classList.remove('mosaic');
            wrapper.style.width = size + 'px';
            mosaicAction.innerHTML = '<i class="icon-ArrowUp"></i>';
            images.map(function(img) {
              return img.src = img.dataset.thumb;
            });
            frozenThumbs = false;
          }
        }

        /**
         * Remove thumbnails
         * @param uid
         */
        function removeThumbnail(uid) {
          // var thumbs = _this.structure.thumbnails.querySelectorAll('a');
          // var size = 0;
          // thumbs.forEach(function (thumb) {
          //   if (thumb.dataset.uid === uid) {
          //     thumb.parentNode.removeChild(thumb);
          //   } else {
          //     size += itsGalleryConfig.config.thumbnailSize;
          //   }
          // });
          // _this.structure.thumbnails_wrapper.style.width = size + 'px';
          updateThumbs();
        }

        /**
         * Gera a estrutura DOM do lighbox
         */
        function generateStructure(actions, len) {
          var deferred = $q.defer();
          if (disabled) {
            deferred.reject(false);
            return deferred.promise;
          }
          disabled = true;
          var backdrop, canvas, header, footer, prev, next, ring, loader, close_btn, caption, region_top_left, region_top_right, region_bottom_left, region_bottom_right; // Variáveis estruturais

          var thumbs_enabled = false;
          if (itsGalleryConfig.config.thumbnails) {
            var thumbnails;
          }

          if (backdrop = document.querySelector('.its-slider__backdrop')) {
            deferred.reject(backdrop);
          } else {
            /* Cria o canvas e o backdrop */
            backdrop = document.createElement('div');
            backdrop.classList.add('its-slider__backdrop');
            canvas = document.createElement('div');
            canvas.classList.add('its-slider__canvas');

            /* Header */
            header = document.createElement('div');
            header.classList.add('its-slider__header');

            /* Footer */
            footer = document.createElement('div');
            footer.classList.add('its-slider__footer');

            /* Thumbnails navigation bar */
            if (itsGalleryConfig.config.thumbnails) {
              thumbnails = document.createElement('div');
              thumbnails.classList.add('its-slider__thumbnails');
              footer.append(thumbnails);
            }

            /* Caption */
            caption = document.createElement('div');
            caption.classList.add('its-slider__caption');

            /* Botões anterior e próximo */
            if (len > 1) {
              prev = document.createElement('div');
              prev.classList.add('its-slider__prev');
              prev.innerHTML = "<i class='icon-ArrowLeft'>";
              next = document.createElement('div');
              next.classList.add('its-slider__next');
              next.innerHTML = "<i class='icon-ArrowRight'>";
            }

            /* Botão fechar */
            close_btn = document.createElement('div');
            close_btn.classList.add('its-slider__close', 'its-slider__action');
            close_btn.innerHTML = "&#10005;";

            /* Regions */
            region_top_left = document.createElement('div');
            region_top_left.classList.add('its-slider__region-top-left');
            region_top_right = document.createElement('div');
            region_top_right.classList.add('its-slider__region-top-right');
            region_bottom_left = document.createElement('div');
            region_bottom_left.classList.add('its-slider__region-bottom-left');
            region_bottom_right = document.createElement('div');
            region_bottom_right.classList.add('its-slider__region-bottom-right');

            /* Loader */
            ring = document.createElement('div');
            ring.classList.add('uil-ring-css');
            ring.style.transform = 'scale(.3)';
            ring.append(document.createElement('div'));
            loader = document.createElement('div');
            loader.classList.add('its-slider__loader');
            loader.append(ring);

            /* Monta a estrutura no DOM */
            header.append(region_top_left);
            header.append(region_top_right);
            footer.append(region_bottom_left);
            footer.append(region_bottom_right);
            region_top_right.append(close_btn);
            backdrop.append(header);
            backdrop.append(footer);
            header.append(caption);
            // backdrop.append(region_top_left);
            // backdrop.append(region_top_right);
            // backdrop.append(region_bottom_left);
            // backdrop.append(region_bottom_right);
            backdrop.append(canvas);
            if (len > 1) {
              backdrop.append(prev);
              backdrop.append(next);
            }
            backdrop.append(loader);
            bodyElement.append(backdrop);

            backdrop.addEventListener('click', end);

            if (typeof actions === 'object' && !Array.isArray(actions)) {
              actions.map(function(val, key){
                return [ val ];
              });
            }

            if (actions.length > 0) {
              /* Considering structure
               * [
               {
               "position": "tl",
               "label": "Deletar",
               "icon": "Trash",
               "callback": ""
               }
               ]
               * */
              var callback = new Array(actions.length);
              for (var i = 0; i < actions.length; i++) {
                var position = actions[i].position || 'tr';
                var label = actions[i].label || '';
                var icon = actions[i].icon || '';
                callback[i] = actions[i].callback || function () {
                  };
                var region;
                switch (position) {
                  case 'tl':
                  case 'top-left':
                  case 'topleft':
                  case 'top_left':
                    region = region_top_left;
                    break;
                  case 'tr':
                  case 'top-right':
                  case 'topright':
                  case 'top_right':
                    region = region_top_right;
                    break;
                  case 'bl':
                  case 'bottom-left':
                  case 'bottomleft':
                  case 'bottom_left':
                    region = region_bottom_left;
                    break;
                  case 'br':
                  case 'bottom-right':
                  case 'bottomright':
                  case 'bottom_right':
                    region = region_bottom_right;
                    break;
                }
                var action = document.createElement('div');
                action.classList.add('its-slider__action');
                action.setAttribute('title', label);
                action.innerHTML = "<i class='icon-" + icon + "'></i>";
                action.onclick = callbackDelegate(callback[i]);
                region.append(action);
              }
            }

            deferred.resolve({
              backdrop: backdrop,
              canvas: canvas,
              prev: prev,
              next: next,
              close_btn: close_btn,
              loader: loader,
              ring: ring,
              caption: caption,
              thumbnails: thumbnails,
              header: header,
              footer: footer,
              tl: region_top_left,
              tr: region_top_right,
              bl: region_bottom_left,
              br: region_bottom_right
            });
          }

          return deferred.promise;
        }

        function prev() {
          if (objectsArray.length === 0) {
            navigate(0);
          } else {
            navigate(-1);
          }
        }

        function next() {
          if (objectsArray.length === 0) {
            navigate(0);
          } else {
            navigate(1);
          }
        }

        function navigateTo(index) {
          // if (typeof index !== 'number')
          index = getIndex(index);
          var current = startFromIndex;
          startFromIndex = index;
          if (current !== startFromIndex) {
            loadCurrentMedia();
          }
        }

        function navigate(direction) {
          // if (disabled) return;
          // disabled = true;
          if (direction === -1) {
            getIndexByDirection('previous');
            loadCurrentMedia();
          } else if (direction === 1) {
            getIndexByDirection('next');
            loadCurrentMedia();
          } else if (direction === 0) {
            disabled = false;
            _this.destroy();
          } else if (direction === -Infinity) {
            startFromIndex = 0;
          }
        }

        function getIndexByDirection(direction) {
          if (direction === 'previous') {
            if (--startFromIndex < 0) startFromIndex = objectsArray.length - 1;
          } else if (direction === 'next') {
            if (++startFromIndex >= objectsArray.length) startFromIndex = 0;
          }
        }

        /**
         * Destrói o slider em si, não os objetos
         */
        function destroy() {
          // console.log('Destruindo apenas o slider, mantendo objetos');
          itsGalleryConfig.config.beforeClose();
          docElement.dispatchEvent(customEvents.beforeClose);
          docElement.removeEventListener('keyup', enableKeys);
          _this.structure.backdrop.removeEventListener('click', end);
          _this.structure.close_btn.removeEventListener('click', _this.destroy);
          if (objectsArray.length > 1) {
            if (_this.structure.hasOwnProperty('prev') && _this.structure.hasOwnProperty('next')) {
              if (_this.structure.prev instanceof HTMLElement && _this.structure.next instanceof HTMLElement) {
                _this.structure.prev.removeEventListener('click', _this.prev);
                _this.structure.next.removeEventListener('click', _this.next);
              }
            }
          }
          _this.structure.backdrop.style.opacity = 0;
          setTimeout(function () {
            var node = _this.structure.backdrop;
            if (node && node.parentNode) {
              node.parentNode.removeChild(node);
            }
            gal = void 0;
            if (typeof endCallback === 'function') {
              endCallback();
            }
            // docElement.removeEventListener('keyup', enableKeys);
            itsGalleryConfig.config.afterClose();
            docElement.dispatchEvent(customEvents.afterClose);
          }, 100);
          // objectsArray = []; //FIXME
        }

        function calcCanvasSize(w, h) {
          var vw = getViewport('x');
          var vh = getViewport('y');
          var rw, rh;
          if (vw / vh <= w / h) { // Se imagem é proporcionalment maior na lateral
            rw = vw >= w ? w : vw;
            rh = rw * h / w;
          } else {
            rh = vh >= h ? h : vh;
            rw = rh * w / h;
          }
          return {
            w: rw,
            h: rh
          }
        }

        function getViewport(axis) {
          var client, inner, offset = 30;
          if (axis === 'x') {
            offset += 144;
            client = docElement['clientWidth'];
            inner = window['innerWidth'];
          }
          else if (axis === 'y') {
            offset += 166;
            client = docElement['clientHeight'];
            inner = window['innerHeight'];
          }
          return client > inner ? inner - offset : client - offset;
        }

        // var preloadImages = function () {
        //
        //   /**
        //    * Lógica esperada:
        //    *
        //    * Dados:
        //    * Array de imagens
        //    * índice da imagem corrente
        //    * tamanho do preload (sendo a imagem corrente + tamanho abaixo + tamanho acima)
        //    * tamanho do array de imagens
        //    *
        //    * Regas:
        //    * Carregar primeiro a imagem corrente
        //    * Após o load da imagem corrente, exibir!
        //    * Caso o tamanho do preload seja maior que o tamanho do array de imagens, deve possuir a mesma length que o array de imagens
        //    */
        //
        //   // Cria um array com a quantidade de imagens para pré-carregar, sendo a própria imagem + x anteriores e x posteriores
        //
        //   // var amount;
        //   // if (objectsArray.length < (amount=(preload<<1)+1)) {
        //   //   amount = objectsArray.length;
        //   // }
        //   // preloadArray = new Array(amount);
        //   // for (var i = 0; i < preloadArray.length; i++) {
        //   //   preloadArray[i] = new Image();
        //   //   //objectsArray[i].src = // image url
        //   // }
        // }

      }
    }


  }

  // Polyfills:
  if (!Array.isArray) {
    Array.isArray = function (arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }
  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function (predicate) {
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var thisArg = arguments[1];
        var k = 0;
        while (k < len) {
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          k++;
        }
        return undefined;
      }
    });
  }

})(window, document, Array, Object, CustomEvent, undefined);
