/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.checkout.review.js - Review page in checkout process
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.checkout.review', {

		initialize: function () {
			this.on( 'submit', '[data-role="couponForm"]', this.submitCoupon );
			this.on( 'submit', '[data-role="paymentForm"]', this.submitPayment );
			this.setup();
		},

		setup: function () {
			var button = this.scope.find('[data-role="couponForm"] button[type="submit"]');
			var textbox = this.scope.find('[data-role="couponForm"] input[type="text"]');

			button.prop('disabled', !textbox.val() );
			textbox.on('keyup', function (e) {
				if ( textbox.val() ) {
					button.prop( 'disabled', false );
				} else {
					button.prop( 'disabled', true );
				}
			});
		},

		submitPayment: function (e) {
			let tAndCRequired = this.scope.find('input[type="checkbox"][name="i_agree_to_tac_checkbox"]');
			if( tAndCRequired.length && !tAndCRequired.is( ':checked ') )
			{
				e.preventDefault();
				e.stopPropagation();
				ips.ui.alert.show( {
					type: 'alert',
					icon: 'warn',
					message: ips.getString('you_must_agree_to_tac'),
					callbacks: {}
				});
			}
		},

		submitCoupon: function (e) {
			e.preventDefault();
		},

		checkTerms: function ( e, elem ) {
			$('#paymentMethodSubmit > button').prop( 'disabled', false );
		}
	});
}(jQuery));