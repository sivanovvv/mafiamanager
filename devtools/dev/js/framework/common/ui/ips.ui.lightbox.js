/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.lightbox.js - Lightbox component
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	/**
	 * @type {Object.<string, {width: number, height: number, solid: boolean}>}
	 */
	const imageDimCache = {};

	/**
	 * @type {Object.<string, Set.<Function>>}
	 */
	const imageResolveCache = {};

	ips.createModule('ips.ui.lightbox', function(){

		var defaults = {
			className: 'ipsLightbox',
			useEvents: false
		};

		var currentLightbox;

		var respond = function (elem, options, e) {
			options = { ...defaults, ...options };
			currentLightbox = new lightboxObj( elem, options, e );
		},

		/**
		 * Destruct this widget on this element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {void}
		 */
		destruct = function (elem) {
			if( currentLightbox ){
				currentLightbox.destruct();
				currentLightbox = null;
			}
		};

		ips.ui.registerWidget('lightbox', ips.ui.lightbox, 
			[ 'group', 'commentsURL', 'className', 'preload', 'useEvents' ],
			{ lazyLoad: true, lazyEvents: 'click' }
		);

		return {
			respond: respond,
			destruct: destruct,

			/**
			 * Get the image dimensions for a given URL
			 *
			 * @param {string} url
			 * @return {Promise<{width: number, height: number, solid: boolean}>}
			 */
			getImageDimensions(url) {
				return new Promise(resolve => {
					if (url in imageDimCache) {
						resolve(imageDimCache[url])
					} else if (url in imageResolveCache) {
						imageResolveCache[url].add(resolve)
					} else {
						imageResolveCache[url] = new Set();
						imageResolveCache[url].add(resolve)
						const img = document.createElement('img')
						let timeout;
						const loaded = () => {
							img.removeEventListener('load', loaded)
							img.removeEventListener('error', loaded)
							clearTimeout(timeout)

							const dims = {
								width: img.naturalWidth,
								height: img.naturalHeight,
								solid: !!(img.naturalWidth && img.naturalHeight)
							}

							img.remove()
							imageDimCache[url] = dims
							setTimeout(() => delete imageDimCache[url], 300000); // clear that cache after 5 minutes
							imageResolveCache[url].forEach(cb => cb(dims))
							imageResolveCache[url].clear()
							delete imageResolveCache[url]
						}

						timeout = setTimeout(loaded, 5000)
						img.addEventListener('load', loaded)
						img.addEventListener('error', loaded)
						img.src = url
					}
				})
			}
		};
	});


	/**
	 * Lightbox instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {void}
	 */
	var lightboxObj = function (elem, options, e) {
		
		if( e ){
			e.preventDefault();
		}

		var imageCollection = [],
			commentsAjax,
			modal, 
			pieces, 
			currentImage,
			phoneBreakpoint = false;

		/**
		 * Kick off showing the lightbox
		 *
		 * @returns 	{void}
		 */
		var init = function () {
			// Blur the trigger
			elem.blur();
			
			_getAllImages();
			_buildModal();
			_buildWrapper();
			_setUpEvents();
			_show();
			_loadFirstImage();
		},

		/**
		 * Destruct this widget on this element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {void}
		 */
		destruct = function () {
			$( document ).off( 'keydown', _keyPress );
			modal.off( 'click', close );
		},

		/**
		 * Sets up the events we'll need to watch for, on the modal, lightbox and doc
		 *
		 * @returns 	{void}
		 */
		_setUpEvents = function () {

			// Lightbox events
			pieces.lightbox
				.on( 'click', '.' + options.className + '_next', nextImage )
				.on( 'click', '.' + options.className + '_prev', prevImage )
				.on( 'click', '.' + options.className + '_close', close )
				.on( 'click', clickedLightbox )
				.on( 'click', '[data-action="rotateImage"]', _rotateImage );

			// Modal events
			modal.on( 'click', close );

			// Document key events
			$( document ).on( 'keydown', _keyPress );

			// Monitor for content changes that we might need to act on
			$( document ).on( 'imageUpdated', _updateImage );
			$( document ).on( 'imageLoading', _mainImageLoading );

			// If we are using events for managing the lightbox, listen for those events
			if( options.useEvents ){
				$( document ).on( 'lightboxDisable_next', function() {
					$('.' + options.className + '_next').hide();
				});

				$( document ).on( 'lightboxDisable_prev', function() {
					$('.' + options.className + '_prev').hide();
				});

				$( document ).on( 'lightboxEnable_next', function() {
					$('.' + options.className + '_next').show();
				});

				$( document ).on( 'lightboxEnable_prev', function() {
					$('.' + options.className + '_prev').show();
				});
			}
		},

		/**
		 * Image needs to be updated event
		 *
		 * @returns 	{void}
		 */
		_mainImageLoading = function( e ) {
			_setLoading( true );

			pieces.imagePanel
				.find('.' + options.className + '_image ')
					.hide();
		},

		/**
		 * Image needs to be updated event
		 *
		 * @returns 	{void}
		 */
		_updateImage = function( e, data ) {
			if( data.closeLightbox === true )
			{
				close(e);
			}
			else if( data.updateImage )
			{
				_showImage( data.updateImage );
			}
		},

		/**
		 * Handles a keydown event
		 *
		 * @returns 	{void}
		 */
		_keyPress = function (e) {
			if( !pieces.lightbox.is(':visible') ){
				return;
			}

			switch( e.keyCode ){
				case ips.ui.key.ESCAPE:
					close(e);
				break;
				case ips.ui.key.RIGHT:
					nextImage(e);
				break;
				case ips.ui.key.LEFT:
					prevImage(e);
				break;
			}
		},

		/**
		 * Retrieves the image that was clicked from imageCollection, then passes it to showImage
		 *
		 * @returns 	{void}
		 */
		_loadFirstImage = function () {
			// Find the image that was clicked
			var firstImage = function () {
				for( var i = 0; i < imageCollection.length; i++ ){
					if( imageCollection[ i ].elem == elem ){
						return imageCollection[ i ];		
					}
				}
			}();

			currentImage = firstImage;
			_showImage( firstImage );
		},

		/**
		 * Handles the process of showing a new image, including loading the image and comments,
		 * determining whether next/prev should show, updating meta data
		 *
		 * @param	{object} 	image 		The image data object from imageCollection, for this image
		 * @returns {void}
		 */
		_showImage = function (image) {
			_setLoading( true );

			pieces.imagePanel
				.find('.' + options.className + '_image ')
					.hide();

			if( image.imageElem ){

				// Hide all images
				pieces.imagePanel.find('.' + options.className + '_image ').hide()

				// Show this image, then hand it off to the event handler
				var thisImage = image.imageElem.css( { opacity: "0" } ).show();

				_imageLoaded( thisImage );
			} else {	

				// New image, so build it and set the event handler
				var thisImage = image.imageElem = $('<img/>')
										.attr( 'src', image.largeImage )
										.addClass( options.className + '_image' )
										.css( { opacity: "0" } )
										.imagesLoaded( function (imagesLoaded){
											try {
												_imageLoaded( $( imagesLoaded.images[0].img ) );
											} catch(err) {
												Debug.error("Error loading image");
											}
										});

				if ( $(image.elem).attr('data-fileId') !== undefined ) {
					thisImage.attr( 'data-fileId', $(image.elem).attr('data-fileId') );
				}
				
				// Hide all images, and append this new one
				pieces.imagePanel
					.find('.' + options.className + '_image ')
						.hide()
					.end()
					.append(
						thisImage
					);
			}

			// rotate the image if we need to
			var rotatedImage = $( '.ipsAttachLink_image img[data-rotate][data-fileId=\'' + thisImage.attr( 'data-fileId' ) + '\']' );
			if ( rotatedImage.length ){
				thisImage.attr( 'data-rotate', $( rotatedImage ).attr( 'data-rotate' ) );
				_applyRotation( thisImage, $( rotatedImage ).attr( 'data-rotate' ) );
			}
			
			// Full size link
			pieces.fullSize.attr( 'href', image.largeImage );

			// Handle comments
			if( image.commentsURL ){
				_loadComments( image );
			} else {
				_hideCommentsPanel();
			}

			// Build meta info
			if( image.meta ){
				pieces.metaPanel
					.show()
					.html( ips.templates.render('core.lightbox.meta', { title: image.meta } ) );
			} else {
				pieces.metaPanel.hide();
			}

			$( elem ).trigger( 'lightboxImageShown', {
				image: image,
				triggerElem: elem
			});
		},

		/**
		 * Loads remote comments into the lightbox
		 *
		 * @param	{object} 	image 		The image data object from imageCollection, for this image
		 * @returns {void}
		 */
		_loadComments = function (image) {

			// Abort anything running already
			if( commentsAjax ){
				Debug.warn("Aborting comment load");
				commentsAjax.abort();
			}

			// Get new ajax object
			pieces.commentsPanel
				.html('')
				.show()
				.addClass( 'ipsLoading' );

			pieces.imagePanel
				.addClass( options.className + '_withComments' );

			commentsAjax = ips.getAjax()( image.commentsURL )
				.done( function (response){
					pieces.commentsPanel
						.html( response )
						.removeClass( 'ipsLoading' );

					$( document ).trigger('contentChange', [ pieces.commentsPanel ]);

					$( elem ).trigger( 'lightboxCommentsLoaded', {
						image: image,
						triggerElem: elem,
						commentsArea: pieces.commentsPanel
					});
				});
		},

		/**
		 * Hides the comments panel
		 *
		 * @returns 	{void}
		 */
		_hideCommentsPanel = function () {
			pieces.commentsPanel.hide();
			pieces.imagePanel.removeClass( options.className + '_withComments' );
		},

		/**
		 * Shows and hides the loading widget on the lightbox
		 *
		 * @param	{boolean} 	status 		True to show, false to hide
		 * @returns {void}
		 */
		_setLoading = function (status) {
			if( status === true ){
				pieces.imagePanel.addClass( 'ipsLoading' );
			} else {
				pieces.imagePanel.removeClass( 'ipsLoading' );

				$( '.' + options.className + '_imagePanel > img, .' + options.className + '_fullSize' )
					.on( 'mouseover', function(){ $( '.' + options.className + '_fullSize' ).show(); } )
					.on( 'mouseout', function(){ $( '.' + options.className + '_fullSize' ).hide(); } );
			}
		},

		/**
		 * Event handler fired when an image has finished loading
		 *
		 * @param	{array} 	image 		Image that has loaded
		 * @returns {void}
		 */
		_imageLoaded = function (image) {
			image.css( { opacity: "1" } );
			_setLoading( false );
			_setButtons( image );
			
			// If we are using events, we can return now and let the events handle the rest
			if( options.useEvents )	{
				return;
			}

			// Toggle the navigation buttons as needed
			if( imageCollection.length < 2 ){
				pieces.next.hide();
				pieces.prev.hide();
			} else {
				var curPos = ( imageCollection ).indexOf( currentImage );

				pieces.next.show();
				pieces.prev.show();

				if( curPos == 0 ){
					pieces.prev.hide();	
				}

				if( curPos == ( imageCollection.length - 1 ) ){
					pieces.next.hide();
				}
			}
		},
		
		/**
		 * Adds any image buttons needed
		 *
		 * @param	{object} 	image 		The image data object from imageCollection
		 * @returns {void}
		 */
		_setButtons = function (image) {
			if( image.attr( 'data-fileId' ) !== undefined ){
				// Inform the document
				$( document ).trigger( 'contentChange', [ $( '.' + options.className ) ] );
			}
		},

		/**
		 * A click on the lightbox
		 *
		 * @param	{event} 	e 		The event object
		 * @returns {void}
		 */
		clickedLightbox = function (e) {
			// Don't fire if we're inside an <a>
			if( $( e.target ).closest('a').length ){
				return;
			}

			// Get window width
			var width = $( document ).width();
			var halfPos = width / 2;

			// If we're clicking the right side of the screen, go forwards.
			// If we're clicking the left side of the screen, go backwards.
			// Otherwise, close the lightbox.
			if( e.pageX >= halfPos && pieces.next.is(':visible') ){
				pieces.next.trigger('click');
			} else if( e.pageX < halfPos && pieces.prev.is(':visible') ){
				pieces.prev.trigger('click');
			} else {
				close();
			}
		},

		/**
		 * Retrieves the next image and shows it
		 *
		 * @param	{event} 	e 		The event object
		 * @returns {void}
		 */
		nextImage = function (e) {
			e.preventDefault();
			e.stopPropagation();

			// If we are using events, we can return now and let the events handle the rest
			if( options.useEvents )
			{
				$( document ).trigger( 'lightboxNextImage' );
				return;
			}

			currentImage = _getNextImage();
			_showImage( currentImage );
		},

		/**
		 * Retrieves the previous image and shows it
		 *
		 * @param	{event} 	e 		The event object
		 * @returns {void}
		 */
		prevImage = function (e) {
			e.preventDefault();
			e.stopPropagation();

			if( options.useEvents )
			{
				$( document ).trigger( 'lightboxPrevImage' );
				return;
			}

			currentImage = _getPrevImage();
			_showImage( currentImage );
		},

		/**
		 * Returns the previous image from imageCollection
		 *
		 * @param	{event} 	e 		The event handler
		 * @returns {object} 	The previous image object
		 */
		_getPrevImage = function (e) {
			var curPos = ( imageCollection ).indexOf( currentImage );

			if( curPos === 0 ){
				return imageCollection[ imageCollection.length - 1 ];
			}

			return imageCollection[ curPos - 1 ];
		},

		/**
		 * Returns the next image from imageCollection
		 *
		 * @param	{event} 	e 		The event handler
		 * @returns {object} 	The next image object
		 */
		_getNextImage = function () {
			var curPos = ( imageCollection ).indexOf( currentImage );

			if( curPos == ( imageCollection.length - 1 ) ){
				return imageCollection[0];
			}

			return imageCollection[ curPos + 1 ];	
		},

		/**
		 * Rotates the image
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		_rotateImage = function (e) {
			e.preventDefault();

			var visibleImage = $( 'img.ipsLightbox_image:visible' );
			var url = $( e.currentTarget ).attr('href') + '&current=' + $( visibleImage ).attr( 'data-rotate' );

			ips.getAjax()( url, {
				showLoading: true
			} )
				.done( function (response) {

					/* Images on the page */
					$('img[data-fileId="' + response.fileId + '"]').each( function() {
						$( visibleImage ).attr( 'data-rotate', response.rotate );
						_applyRotation( this, response.rotate );

						/* Only trigger the imageRotated event if we permanently stored the rotation angle */
						if( response.saved == 1 ){
							$( document ).trigger( 'imageRotated', response );
						}
					} );
										
					ips.ui.flashMsg.show( response.message );
				})
				.fail( function () {
					window.location = url;
				});
		},

		/**
		 * Apply the transformation CSS to rotate the image properly
		 *
		 * @param	{object}	elem
		 * @param 	{string}	angle
		 * @returns	{void}
		 */
		_applyRotation = function( elem, angle ){
			$(elem).css( { 'transform': 'rotate(' + angle + 'deg)' } );

			/* If we are rotating the image on its side, adjust the width so that it fits in the panel */
			if( angle == '90' || angle == '-90' ) {
				var panelHeight = $( elem ).parents( '.ipsLightbox_imagePanel' ).height();
				$( elem ).css( {
					'max-width': ( panelHeight - 20 ).toString() + 'px'
				});
			}
		},

		/**
		 * Closes the lightbox
		 *
		 * @param	{event} 	e 		The event handler
		 * @returns {void}
		 */
		close = function (e) {
			if( e ){
				e.preventDefault();
				e.stopPropagation();	
			}
			
			$( document ).off( 'imageUpdated', _updateImage );
			$( document ).off( 'imageLoading', _mainImageLoading );

			modal.hide();
			pieces.lightbox.hide();
		},

		/**
		 * Displays the lightbox on-screen
		 *
		 * @returns 	{void}
		 */
		_show = function () {
			ips.utils.anim.go( 'fadeIn fast', modal );
			ips.utils.anim.go( 'fadeIn fast', pieces.lightbox );
			//pieces.lightbox.show();
		},

		/**
		 * Builds the lightbox UI
		 *
		 * @returns 	{void}
		 */
		_buildWrapper = function () {

			// Build pieces
			pieces = {
				lightbox: $('<div/>')
					.addClass( options.className )
					.css( { zIndex: ips.ui.zIndex() } ),

				imagePanel: $('<div/>')
					.addClass( options.className + '_imagePanel' ),

				commentsPanel: $('<div/>')
					.addClass( options.className + '_commentsPanel' )
					.html('')
					.hide(),
				
				toolsPanel: $('<div/>')
					.addClass( options.className + '_toolsPanel' )
					.html('')
					.hide(),
				
				next: $('<a/>')
					.addClass( options.className + '_next' )
					.html("<i class='fa-solid fa-angle-right'></i>"),

				prev: $('<a/>')
					.addClass( options.className + '_prev' )
					.html("<i class='fa-solid fa-angle-left'></i>"),

				close: $('<a/>')
					.addClass( options.className + '_close' )
					.html("&times;"),

				fullSize: $('<a/>')
					.attr( 'href', '#' )
					.attr( 'target', '_blank' )
					.addClass( options.className + '_fullSize' ),

				metaPanel: $('<div/>')
					.addClass( options.className + '_meta' )
					.hide()
			};

			// Assemble
			pieces.lightbox
				.append( 
					pieces.imagePanel
						.append( pieces.next )
						.append( pieces.prev )
						.append( pieces.fullSize )
						
				)
				.append( pieces.metaPanel )
				.append( pieces.commentsPanel )
				.append( pieces.toolsPanel )
				.append( pieces.close );

			$('body').append( pieces.lightbox );
		},

		/**
		 * Populates imageCollection with the images grouped with this lightbox
		 *
		 * @returns 	{void}
		 */
		_getAllImages = function () {
			
			if( options.group ){
				var images = $('[data-ipslightbox-group="' + options.group + '"]');
			} else {
				var images = $( elem );
			}

			$.each( images, function (i, thisElem) {
				imageCollection.push( _returnImageData( thisElem ) );
			});
		},

		/**
		 * Returns image data for the provided element
		 *
		 * @param	{element} 	thisElem 		The element being worked with
		 * @returns {object} 	Image data
		 */
		_returnImageData = function (thisElem) {

			var origImage,
				largeImage;

			if( thisElem.tagName != 'IMG' ){
				origImage = $( thisElem ).find('img').attr('src');
			} else {
				origImage = $( thisElem ).attr('src');
			}

			if( $( thisElem ).attr('data-fullURL') ){
				largeImage = $( thisElem ).attr('data-fullURL');
			} else if( $(thisElem).is(':is(a, i-lightbox)') && $( thisElem ).attr('href') ){
				largeImage = $( thisElem ).attr('href');
			}

			return {
				elem: thisElem,
				originalImage: origImage,
				largeImage: largeImage || origImage,
				meta: $( thisElem ).attr('data-ipsLightbox-meta'),
				commentsURL: $( thisElem ).attr('data-ipsLightbox-commentsURL')
			};
		},

		/**
		 * Gets the modal element from ips.ui, and sets a new zIndex on it
		 *
		 * @returns 	{void}
		 */
		_buildModal = function () {
			modal = ips.ui.getModal();
			modal.css( { zIndex: ips.ui.zIndex() } );
		};

		init();

		return {
			destruct: destruct
		};
	};
}(jQuery));