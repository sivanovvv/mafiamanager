/**
 * IPS Social Suite 4
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.contentMessage
 *
 * Author: Matt Mecham
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.contentMessage', {

		initialize: function () {
			this.on( 'change', '#check_message_is_public', this.updateEditorBorder );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			this.scope.find('.ipsComposeArea_editor').addClass('cContentMessageEditor');
			this.updateEditorBorder();
		},

		/**
		 * Add a context sensitive border around the editor
		 *
		 * @returns {void}
		 */
		updateEditorBorder: function () {
			if ( $('#check_message_is_public').is(":checked") ) {
				this.scope.find('.ipsComposeArea_editor').removeClass('cContentMessageEditor--private').addClass('cContentMessageEditor--public');
			} else {
				this.scope.find('.ipsComposeArea_editor').removeClass('cContentMessageEditor--public').addClass('cContentMessageEditor--private');
			}
		}
	});
}(jQuery));