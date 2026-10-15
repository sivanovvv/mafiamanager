/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.giftCard.js - Gift card purchase screen
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.store.giftCard', {

		initialize: function () {
			this.on( 'click', '[data-color]', this.toggleColor );
			this.on( 'change', '[name="gift_voucher_amount"], [name="x_gift_voucher_amount"]', this.changeAmount );
			this.setup();
		},

		setup: function () {
			this.changeAmount();
			if ( $('input[name="gift_voucher_color"]').val() ) {
				this.setColor( $('input[name="gift_voucher_color"]').val() );
			}
		},

		/**
		 * Event handler for changing the amount of the gift card
		 *
		 * @returns {void}
		 */
		changeAmount: function () {
			var amountVal = this.scope.find('[name="gift_voucher_amount"]:checked').val();
			var customVal = this.scope.find('[name="x_gift_voucher_amount"]').val();
			var amount = 0;

			if( amountVal == 'x' ){
				if( customVal !== undefined && customVal != '' && customVal != 'x' ){
					amount = customVal;
				} 
				
				var scope = this.scope;
				ips.getAjax()( this.scope.attr('data-formatCurrencyUrl') + '&amount=' + amount )
					.done( function (response) {
						scope.find('[data-role="value"]').text( response );
					});
			} else {
				amount = amountVal;				
				this.scope.find('[data-role="value"]').text( this.scope.find( 'label[for="' + this.scope.find('[name="gift_voucher_amount"]:checked').attr('id') + '"]' ).text() );
			}
		},

		/**
		 * Toggles the color being used for the gift card
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggleColor: function (e) {
			e.preventDefault();
			var swatch = $( e.currentTarget );
			var color = swatch.attr('data-color');
			this.setColor(color);
		},
		
		/**
		 * Sets being used for the gift card
		 *
		 * @param 	{string} 	color	The color
		 * @returns {void}
		 */
		setColor: function (color) {
			this.scope
				.find('[data-role="giftCard"]').css({
					backgroundColor: '#' + color
				})
				.end()
				.find('input[type="hidden"][name="gift_voucher_color"]')
					.val( '#' + color )
				.end()
				.find('[data-color]')
					.closest('li')
					.removeAttr('data-selected');

			$(this.scope).find('[data-color="' + color + '"]').closest('li').attr( 'data-selected', true );
		}
	});
}(jQuery));