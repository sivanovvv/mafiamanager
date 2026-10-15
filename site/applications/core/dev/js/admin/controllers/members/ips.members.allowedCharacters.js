/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.members.allowedCharacters.js - Controller for setting to control which characters are allowed in usernames
 *
 * Author: Mark Eade
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.members.allowedCharacters', {

		initialize: function () {
			this.on( 'click', '[data-action="easy"]', this.showEasy );
			this.on( 'click', '[data-action="regex"]', this.showRegex );

			this.setup();
		},
		
		showEasy: function(e){
			if (e) {
				e.preventDefault();
			}
			this.scope.find('[data-role="easy"]').show();
			this.scope.find('[data-role="regex"]').hide();
			this.scope.find('[data-role="easyInput"]').val('1');
		},
		
		showRegex: function(e){
			if (e) {
				e.preventDefault();
			}
			this.scope.find('[data-role="regex"]').show();
			this.scope.find('[data-role="easy"]').hide();
			this.scope.find('[data-role="easyInput"]').val('0');
		},

		setup: function () {
			this.scope.find('[data-action="easy"]').show();
			this.scope.find('[data-action="regex"]').show();
			if ( this.scope.attr('data-easy') == 1 ) {
				this.showEasy();
			}
		}
	});
}(jQuery));