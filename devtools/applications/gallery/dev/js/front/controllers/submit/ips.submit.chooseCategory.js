/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.submit.chooseCategory.js - AJAX to show album options after selecting category
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.front.submit.chooseCategory', {

		_chosen: false,
		_resizeTimer: null,

		initialize: function () {			
			this.on( 'nodeItemSelected', '[data-name="image_category"]', this.chooseCategory );
			this.on( 'nodeSelectedChanged', '[data-name="image_category"]', this.chooseCategoryInitially );
			this.on( 'click', '[data-action="continueNoAlbum"]', this.continueNoAlbum );
			this.on( 'click', '[data-type]:not([data-disabled])', this.chooseAlbumType );

			// Try to set the dialog title
			this.setup();

			// But in some cases we finish loading before the wrapper controller, so also listen for the wrapper controller to finish
			// and set the title then, if appropriate
			this.on( document, 'gallery.wrapperInit', this.setup );
		},
		
		setup: function () {
			// Set the dialog title depending on what's being shown
			if( this.scope.find('[data-role="categoryForm"]').length ){
				this.trigger('gallery.updateTitle', { title: ips.getString('chooseCategory') });
			} else {
				this.trigger('gallery.updateTitle', { title: ips.getString('chooseAlbum') });
			}
		},

		chooseAlbumType: function (e) {
			e.preventDefault();

			var target = $( e.currentTarget );

			switch( target.attr('data-type') ){
				case 'category':
					target.next('form').trigger('submit');
				break;
				case 'createAlbum':
					this.trigger('gallery.updateTitle', { title: ips.getString('createAlbum') });
					this._resizeFormDiv( this.scope.find('[data-role="createAlbumForm"]') );
				break;
				case 'existingAlbum':
					this.trigger('gallery.updateTitle', { title: ips.getString('existingAlbum') });
					this._resizeFormDiv( this.scope.find('[data-role="existingAlbumForm"]') );
				break;
			}
		},

		/**
		 * Controller destroy handler
		 *
		 * @returns {void}
		 */
		destroy: function () {
			if( this._resizeTimer ){
				clearInterval( this._resizeTimer );
			}
		},

		/**
		 * Resize the dialog to fit the form being shown inside it
		 *
		 * @param	{element} 	form 		The form being shown
		 * @returns {void}
		 */
		_resizeFormDiv: function (form) {
			this.scope.find('[data-role="chooseAlbumType"]').prop('hidden', true);
			form.prop('hidden', false);
		},

		/**
		 * Responds to the initial event put out by the select tree when it selects the default value
		 *
		 * @param	{event} 	e 		Event object
		 * @param	{object} 	data 	Event data object
		 * @returns {void}
		 */
		chooseCategoryInitially: function (e, data) {
			if( this._chosen ){
				return;
			}

			if( !Array.isArray( data.selectedItems ) ){
				return;
			}

			var id = data.selectedItems[0];

			if( id !== undefined ){
				this._chosen = true;
				this.showAlbumOptions( id );
			}
		},
		
		/**
		 * Choose Category
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		chooseCategory: function (e, data) {
			if( this._chosen ){
				return;
			}
			
			this._chosen = true;
			this.showAlbumOptions(data.id);
		},

		/**
		 * Continue the wizard without doing an album
		 *
		 * @param	{event} 	e 	Event object
		 * @returns {void}
		 */
		continueNoAlbum: function (e) {
			e.preventDefault();
			$( e.currentTarget ).closest('form').trigger('submit');
		},
		
		/**
		 * Trigger Category Selection
		 *
		 * @param	{int} 	id	Selected ID
		 * @returns {void}
		 */
		showAlbumOptions: function (id) {
			var outerWrapper = this.scope.closest('.ipsDialog_content');
			var self = this;

			outerWrapper.addClass('ipsLoading');
			this.scope.hide();
			
			// Fire AJAX
			ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=gallery&module=gallery&controller=submit&noWrapper=1&category=' + id + '&album=' + this.scope.attr('data-preselected-album') )
				.done( function (response) {
					if( response ){
						self.trigger( 'gallery.submit.response', {
							response: response 
						});						
					} else {
						self.scope.find('[data-role="continueCategory"]').show();
					}
				})
				.fail(function(err){
					self.scope.find('[data-role="continueCategory"]').show();
				})
				.always( function() {
					outerWrapper.removeClass('ipsLoading');
					self.scope.show();
				});
		},
		
	});
}(jQuery));
