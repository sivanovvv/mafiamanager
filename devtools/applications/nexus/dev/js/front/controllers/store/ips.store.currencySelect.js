/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.currencySelect.js - Alert when changing currency
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.store.currencySelect', {

		currencyChangeWarningConfirmed: false,

		initialize: function () {
			this.on( 'submit', 'form', this.currencyChangeWarning );
		},
		
		/**
		 * Prevent checkout button being clicked more than once
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		currencyChangeWarning: function (e) {
			if( this.currencyChangeWarningConfirmed )
			{
				return;
			}

			e.preventDefault();

			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('store_currency_change_warning'),
				icon: 'warn',
				callbacks: {
					ok: () => {
						this.currencyChangeWarningConfirmed = true;
						let submitButton = (e instanceof SubmitEvent || e.originalEvent.submitter instanceof Element) ? e.originalEvent.submitter : e.target.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
						submitButton.click();
					}
				}
			});
			
			
		}
	});
}(jQuery));