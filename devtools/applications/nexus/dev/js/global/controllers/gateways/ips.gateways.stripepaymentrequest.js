/**
 * IPS Community Suite 4
 * (c) 2017 Invision Power Services - http://www.invisionpower.com
 *
 * ips.gateways.stripepaymentrequest.js - Stripe Apple Pay Controller
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.global.gateways.stripepaymentrequest', {
		
		strile: null,
		
		/**
		 * Init
		 */
		initialize: function () {
			this.setup();
		},
		
		/**
		 * Init
		 */
		setup: function(){
						
			this.stripe = Stripe( this.scope.attr('data-key') );
						
			var data = {
				country: this.scope.attr('data-country'),
				currency: this.scope.attr('data-currency'),
				total: {
					label: $('meta[property="og:site_name"]').attr('content'),
					amount: parseInt( this.scope.attr('data-amountAsCents') )
				}
			};
			var paymentRequest = this.stripe.paymentRequest(data);
			
			var elements = this.stripe.elements();
			var prButton = elements.create('paymentRequestButton', {
				paymentRequest: paymentRequest
			});
			
			var scope = this.scope;
			paymentRequest.canMakePayment().then(function(result) {
				if (result) {
					prButton.mount( '#paymentrequest-' + scope.attr('id') );
				} else {
					ips.utils.cookie.set( 'PaymentRequestAPI', 0 );
						
					var paymentMethodRadio = $( '#elRadio_payment_method_' + scope.attr('data-id') );
					if ( paymentMethodRadio.length ) {
						if ( paymentMethodRadio.is(':checked') ) {
							paymentMethodRadio.closest('li').next('li').find('input[type="radio"]').trigger('click');
						}
						paymentMethodRadio.closest('li').remove();
					} else {
						window.location = window.location;
					}
				}
			} );
			
			paymentRequest.on('source', function(ev) {
				ips.getAjax()( ips.getSetting('baseURL') + 'applications/nexus/interface/gateways/stripe-payrequest.php', { data: { token: ev.source.id, gateway: this.scope.attr('data-id'), currency: this.scope.attr('data-currency'), amount: this.scope.attr('data-amount'), invoice: this.scope.attr('data-invoice') } } )
				.done(function(response){
					if ( response.success ) {
						ev.complete('success');
						window.location = response.url;
					} else {
						ev.complete('fail');
					}
				})
				.fail(function(){
					ev.complete('fail');
				});
			}.bind(this));
		},		
		
	});
}(jQuery));