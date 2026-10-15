/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.submit.linkedScreenshots.js - Controller to handle linked screenshots
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('downloads.front.submit.linkedScreenshots', {

		initialize: function () {
			this.on( 'click', '[data-action="addField"]', this.addFieldButton );
			this.on( 'click', '[data-action="removeField"]', this.removeField );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			var initialValues = JSON.parse( $(this.scope).attr('data-initialValue') );

			if( initialValues == null )
			{
				return;
			}

			var i;
			for ( i in initialValues.values ) {
				this.addField( i, initialValues.values[i], i == initialValues.default );
			}
		},
		
		/**
		 * Add a field
		 *
		 * @returns 	{void}
		 */
		addField: function ( id, value, isDefault ) {
			$(this.scope).find('[data-role="fieldsArea"]').append( ips.templates.render( 'downloads.submit.linkedScreenshot', {
				'name': $(this.scope).attr('data-name'),
				'id': id,
				'value': value,
				'extra': isDefault ? 'checked' : ''
			}) );
		},
		
		/**
		 * Remove a field
		 *
		 * @returns 	{void}
		 */
		removeField: function ( e ) {
			$(e.currentTarget).closest('li').remove();
		},
		
		/**
		 * Respond to add button
		 *
		 * @returns 	{void}
		 */
		addFieldButton: function () {
			this.addField( 'linked_' + new Date().getTime(), '', false );
		}
	});
}(jQuery));