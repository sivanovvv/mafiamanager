/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.cartReview.js - Cart review screen
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.store.cartReview', {

		initialize: function () {
			this.on( 'click', '[data-action="removeFromCart"]', this.removeFromCart );
			this.on( 'click', '[data-action="dialogClose"]', this.dialogClose );
			this.on( 'submit', '[data-role="quantityForm"]', this.quantityForm );
			this.on( 'click', '[data-action="checkout"]', this.checkout );
		},
		
		/**
		 * Prevent checkout button being clicked more than once
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		checkout: function (e) {
			if ( $(e.target).hasClass('ipsButton--disabled') ) {
				e.preventDefault();
			} else {
				$(e.target).addClass('ipsButton--disabled');
			}
		},

		/**
		 * Removes the item from the cart
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		removeFromCart: function (e) {
			e.preventDefault();
			var self = this;
			var url = $( e.currentTarget ).attr('href');

			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('confirmRemoveItem'),
				icon: 'warn',
				callbacks: {
					ok: function () {
						ips.getAjax()( url )
							.done( function (response) {
								self.scope.find('[data-role="cart"]').html( response );
							});
					}
				}
			});
		},

		/**
		 * Handles submitting the quantity form
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		quantityForm: function (e) {
			e.preventDefault();
			var self = this;
			var form = $( e.currentTarget );

			// Do ajax request to update it
			ips.getAjax()( form.attr('action'), {
				data: form.serialize()
			})
				.done( function (response) {
					self.scope.find('[data-role="cart"]').html( response );
				})
				.fail(function(response){
					ips.ui.alert.show( {
						type: 'alert',
						icon: 'warn',
						message: response.responseJSON
					});

				});
		},

		/**
		 * Event handler for the 'Continue Shopping' link
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		dialogClose: function (e) {
			if( this.scope.closest('.ipsDialog').length ){
				this.scope.closest('.ipsDialog').trigger('closeDialog');
			}
		},
	});
}(jQuery));