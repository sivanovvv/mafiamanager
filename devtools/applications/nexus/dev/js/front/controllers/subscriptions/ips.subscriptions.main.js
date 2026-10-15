/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.subscriptions.main.js - Register form during checkout
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.subscriptions.main', {

		initialize: function () {
			this.on( 'click', '[data-change-subscription]', this.showAlert );
			if ( $(this.scope).attr('data-regform') ) {
				this._showRegistrationForm();
			}
		},
		
		showAlert: function (e) {
			e.preventDefault();
			ips.ui.alert.show({
				type: 'confirm',
				message: $( e.currentTarget ).attr('data-change-message'),
				icon: 'warn',
				callbacks: {
					ok: function () {
						window.location = $( e.currentTarget ).attr('href');
					},
					cancel: function () {
						return false;
					}
				}
			});
		}
	});
}(jQuery));