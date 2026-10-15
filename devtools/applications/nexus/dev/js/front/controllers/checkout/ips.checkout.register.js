/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.checkout.register.js - Register form during checkout
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.checkout.register', {

		initialize: function () {
			this.on( 'click', '[data-action="newMember"]', this.showRegistrationForm );
			if ( $(this.scope).attr('data-regform') ) {
				this._showRegistrationForm();
			}
		},

		showRegistrationForm: function (e) {
			e.preventDefault();
			this._showRegistrationForm();
		},
		
		_showRegistrationForm: function() {
			this.scope.find('[data-role="memberChoice"]').hide();
			this.scope.find('[data-role="newCustomerForm"]').show();

			this.scope.find('[data-role="business"]').hide();

		}
	});
}(jQuery));