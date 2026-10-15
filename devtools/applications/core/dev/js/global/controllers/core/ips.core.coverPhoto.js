/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.coverPhoto.js - Controller for cover photos
 *
 * Author: Rikki Tissier and Ehren Harber
 */
;( function($, undefined){
	"use strict";

	ips.controller.register('core.global.core.coverPhoto', {

		_image: null,
		_existingPosition: 0,
		_tooltip: null,
		_expandedCover: false,
		_newPosition: 0,
		_container: null,
		_editingPosScroll: 0,
		_editingPosMouse: 0,

		initialize: function () {
			var self = this;
			this.on( 'menuItemSelected', function(e){
				var button = $( e.detail.originalEvent.target ).closest( '[data-action]' );
				switch( $( button ).attr( 'data-action' ) ){
					case 'removeCoverPhoto':
						self.removePhoto(e.detail);
						break;
					case 'positionCoverPhoto':
						self.positionPhoto(e.detail.originalEvent);
						break;
				}
			});
			
			this.on( 'click', '[data-action="savePosition"]', this.savePosition );
			this.on( 'click', '[data-action="cancelPosition"]', this.cancelPosition );
			this.on( 'click', '[data-action="toggleCoverPhoto"]', this.toggleCoverPhoto );

			this.setup();
		},

		/**
		 * Setup method.
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			this._image = this.scope.find('.ipsCoverPhoto__image');

			// Get the URL bits and see if we're immediately going into position mode
			var doPosition = ips.utils.url.getParam('_position');

			if(doPosition != undefined) this.positionPhoto();

		},

		/**
		 * Removes the cover photo
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		removePhoto: function (data) {
			data.originalEvent.preventDefault();
			var self = this;
			var target = $( data.originalEvent.target ).closest( '[data-action="removeCoverPhoto"]' );

			ips.ui.alert.show( {
				type: 'confirm',
				icon: 'warn',
				message: ips.getString('confirmRemoveCover'),
				callbacks: {
					ok: function () {
						ips.getAjax()( $( target ).attr('href') + '&wasConfirmed=1' )
							.done( function () {

								ips.utils.anim.go( 'fadeOut', self._image )
									.done( function () {
										ips.ui.flashMsg.show( ips.getString('removeCoverDone') );
									});

								$(data.menuElem).find('[data-role="photoEditOption"]').prop('hidden', true);
								document.body.dispatchEvent(new CustomEvent('ipsDataLayerSync', {bubbles: true}));
							})
							.fail( function (err) {
								window.location = $( target ).attr( 'href' );
							});
					}
				}
			});
		},

		/**
		 * Save a new position of the cover photo
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		savePosition: function (e) {
			e.preventDefault();

			let newPos = ((this._container.scrollTop / (this._container.scrollHeight - this._container.clientHeight)) * 100);

			newPos = newPos || 0;

			this._newPosition = newPos;

			this.scope.attr( 'data-coverOffset', this._newPosition );
			this.scope.css({
				'--offset': this._newPosition
			});
			
			ips.getAjax()( this.scope.attr('data-url') + '&do=coverPhotoPosition' + '&offset=' + this._newPosition )
				.done(() => {
					document.body.dispatchEvent(new CustomEvent('ipsDataLayerSync', {bubbles: true}));
				})
				.fail( function (err) {
					this.scope.attr('data-url') + '&do=coverPhotoPosition' + '&offset=' + this._newPosition;
				});
							
			this._resetImage();
		},

		/**
		 * Cancels changing the position of the image
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		cancelPosition: function (e) {
			e.preventDefault();

			this._resetImage();
		},

		/**
		 * Starts the 'editing' state of the cover photo
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		positionPhoto: function (e) {

			if(e != undefined) e.preventDefault();
			
			this.scope.addClass('ipsCoverPhoto--editing');

			this._existingPosition = parseInt( this.scope.attr('data-coveroffset') ) || 0;

			this._container = this.scope.find('.ipsCoverPhoto__container')[0];

			// Bind this to event listener function so it can be removed later with removeEventListener
			this._mouseDownHandler = this._mouseDownHandler.bind(this);
			this._container.addEventListener('mousedown', this._mouseDownHandler);
		    this._mouseUpHandler = this._mouseUpHandler.bind(this);
		    this._container.addEventListener('mouseup', this._mouseUpHandler);
		    this._mouseOutHandler = this._mouseOutHandler.bind(this);
		    this._container.addEventListener('mouseout', this._mouseOutHandler);

			this._container.scrollTop = (this._container.scrollHeight - this._container.clientHeight) * (this._existingPosition / 100);

			this.scope.find('.ipsCoverPhoto__container').after( ips.templates.render('core.coverPhoto.controls') );
			this._showTooltip();
		},

		_mouseDownHandler: function (e) {
			e.preventDefault();
			this._editingPosMouse = e.clientY;
			this._editingPosScroll = this._container.scrollTop;

		    this._mouseMoveHandler = this._mouseMoveHandler.bind(this);
		    this._container.addEventListener('mousemove', this._mouseMoveHandler);
		},

		_mouseMoveHandler: function(e){
			let dy = (e.clientY - this._editingPosMouse) * 2.3;
			this._container.scrollTop = this._editingPosScroll - dy;
		},

		_mouseUpHandler: function(e){
			this._container.removeEventListener('mousemove', this._mouseMoveHandler);
		},

		_mouseOutHandler: function(e){
			this._container.removeEventListener('mousemove', this._mouseMoveHandler);
		},

		/**
		 * Cancels the 'editing' state of the cover photo
		 *
		 * @returns 	{void}
		 */
		_resetImage: function () {

			this._container.removeEventListener('mousedown', this._mouseDownHandler);

			this.scope.removeClass('ipsCoverPhoto--editing');

			this.scope.find('[data-role="reposition"]').remove();
			this.scope.find('[data-role="coverPhotoControls"]').remove();

			this._hideTooltip();

			// Reset the URL so refreshing the page does not re-trigger repositioning
			ips.utils.history.pushState({}, 'core.global.core.coverPhoto', ips.utils.url.removeParam( 'csrfKey', this.scope.attr('data-url') ) );
		},

		/**
 		 * Shows a tooltip on the autocomplete with the provided message
		 *
		 * @param 	{string} 	msg 	Message to show
		 * @returns {void}
		 */
		_showTooltip: function (msg) {
			if( !this._tooltip ){
				this._buildTooltip();
			}
			this._tooltip.hidden = false;
			this._tooltip.textContent = ips.getString('dragCoverPhoto');
		},

		/**
 		 * Hides the tooltip
		 *
		 * @returns {void}
		 */
		_hideTooltip: function () {
			if( this._tooltip){
				this._tooltip.hidden = true;
			}
		},

		/**
 		 * Builds the tooltip element
		 *
		 * @param 	{string} 	msg 	Message to show
		 * @returns {void}
		 */
		_buildTooltip: function () {
			this.elem.insertAdjacentHTML("beforeend", "<div class='ipsCoverPhoto__tooltip' hidden></div>");
			this._tooltip = this.elem.querySelector('.ipsCoverPhoto__tooltip');
		},

		/**
		 * Toggles cover photo to full height
		 *
		 * @returns 	{void}
		 */
		toggleCoverPhoto: function () {
			if( this._expandedCover == false ) {

				let naturalImage = this.scope.find('.ipsCoverPhoto__image')[0],
					ratio = naturalImage.naturalWidth / naturalImage.naturalHeight;

					this.scope.find('.ipsCoverPhoto__container').css(
						"--coverPhoto--ratio", ratio
					);

				this._expandedCover = true;
				this.scope.addClass('ipsCoverPhoto--expanded');
			} else {
				this._expandedCover = false;
				this.scope.removeClass('ipsCoverPhoto--expanded');
			}			
		},
	});
}(jQuery));