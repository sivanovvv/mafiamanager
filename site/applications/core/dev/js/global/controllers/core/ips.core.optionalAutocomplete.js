/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.prefixedAutocomplete.js - Controller for prefix functionality
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.optionalAutocomplete', {

		_autoComplete: null,
		_closedTagging: false,

		initialize: function () {
			this.setup();
			this.on('click', '[data-action="showAutocomplete"]', this.showAutocomplete);
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			this._autoComplete = this.scope.find('[data-ipsAutocomplete]');

			if( this._autoComplete.attr('data-ipsAutocomplete-minimized') !== undefined ){
				return;
			}

			// Wrap the contents of the row so that we can hide it, and show on demand
			var div = $('<div data-role="autoCompleteWrapper" />').html( this.scope.contents() ).hide();
			this.scope.html( div );
			this.scope.append( ips.templates.render('core.autocomplete.optional', { langString: ips.getString( this._autoComplete.attr('data-ipsAutocomplete-lang') ) } ) );
			this.scope.closest('.ipsFieldRow').find('.ipsFieldRow__label').hide();

			// Get the options the autocomplete uses
			this._closedTagging = this._autoComplete.attr('data-ipsAutocomplete-freeChoice') === 'false';
		},

		/**
		 * Toggles showing the autocomplete field
		 *
		 * @returns 	{void}
		 */
		showAutocomplete: function (e) {
			if( e ){
				e.preventDefault();
				e.stopPropagation();
			}
			
			var self = this;
			var autoCompleteObj = ips.ui.autocomplete.getObj( this._autoComplete );

			this.scope.find('[data-action="showAutocomplete"]').hide();
			this.scope.find('[data-role="autoCompleteWrapper"]').show();
			this.scope.closest('.ipsFieldRow').find('.ipsFieldRow__label').show();

			setTimeout( function () {
				if( self._closedTagging ){
					self.scope.find('[data-action="addToken"]').trigger('click');
				} else {
					autoCompleteObj.trigger('focus');
				}
			}, 100);
		}
	});
}(jQuery));