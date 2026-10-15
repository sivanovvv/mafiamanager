/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.cropper.js - Cropping controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.cropper', {

		_image: null,
		_coords: {},

		initialize: function () {
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			var self = this;

			this._image = this.scope.find('[data-role="profilePhoto"]');
			this._coords = {
				topLeftX: this.scope.find('[data-role="topLeftX"]'),
				topLeftY: this.scope.find('[data-role="topLeftY"]'),
				bottomRightX: this.scope.find('[data-role="bottomRightX"]'),
				bottomRightY: this.scope.find('[data-role="bottomRightY"]'),
			};

			this._image.css({
				maxWidth: '100%'
			});

			ips.loader.getStatic( ['applications/core/interface/static/cropper/cropper.min.js'] ).then( function () {
				self._image.imagesLoaded( self._startCropper.bind(self) );
 			});
		},

		/**
		 * Starts the cropping function, called after the image has loaded
		 *
		 * @returns {void}
		 */
		_startCropper: function () {
			var self = this;

			var width = this._image.width();
			var height = this._image.height();

			// Resize the wrapper
			this._image.closest('[data-role="cropper"]').css({
				width: width + 'px',
				height: height + 'px'
			});

			// Initialize cropper
			var cropper = new Cropper( this._image.get(0), {
				aspectRatio: 1 / 1,
				autoCropArea: 0.9,
				responsive: true,
				zoomOnWheel: false,
				crop: function ( e ) {					
					self._coords.topLeftX.val( e.detail.x );
					self._coords.topLeftY.val( e.detail.y );
					self._coords.bottomRightX.val( e.detail.width + e.detail.x );
					self._coords.bottomRightY.val( e.detail.height + e.detail.y );
				}
			});
		}
	});
}(jQuery));