/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.register.js - Register screen in Nexus
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.store.register', {

		_infoPaneWrapper: null,
		_infoPane: null,

		initialize: function () {
			this.on( 'click', '[data-role="productCarousel"] .cNexusProduct', this.selectProduct );
			this.on( 'click', '[data-action="closeInfo"]', this.closeInfo );
			this.on( 'addToCart.nexus', this.addToCart );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			this._infoPaneWrapper = this.scope.find('[data-role="productInformationWrapper"]');
			this._infoPane = this.scope.find('[data-role="productInformation"]');
		},

		/**
		 * Event handler for closing the info panel
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		closeInfo: function (e) {
			e.preventDefault();

			this.scope.find('[data-role="productCarousel"] .cNexusProduct').removeClass('cNexusProduct_selected');

			this._infoPaneWrapper
				.hide()
				.find('[data-action="closeInfo"]')
					.hide();
		},

		/**
		 * Highlights a product on the registration screen and loads its overview to display
		 *
		 * @param 	{event} 	e 		Event object
		 * @returns {void}
		 */
		selectProduct: function (e) {
			e.preventDefault();
			var selectedProduct = $( e.currentTarget );
			var self = this;

			this.scope.find('[data-role="productCarousel"] .cNexusProduct').removeClass('cNexusProduct_selected');
			selectedProduct.addClass('cNexusProduct_selected');

			// Get the URL of the selected product
			var url = selectedProduct.find('[data-role="productLink"]').attr('href');
			var height = 200;

			// Set info area to loading
			if( this._infoPaneWrapper.is(':visible') ){
				height = this._infoPane.height();
			}
			
			this._infoPaneWrapper
				.show()
				.find('[data-action="closeInfo"]')
					.hide();

			this._infoPane
				.css({
					height: height + 'px'
				})
				.html('')
				.addClass('ipsLoading');

			// Now load
			ips.getAjax()( url )
				.done( function (response) {
						
					self._infoPaneWrapper
						.find('[data-action="closeInfo"]')
							.show();

					self._infoPane
						.removeClass('ipsLoading')
						.css({
							height: 'auto'
						})
						.html( response );

					$( document ).trigger( 'contentChange', [ self._infoPane ] );
				});
		},

		/**
		 * Adds the item to cart via ajax, and creates a dialog to let the user know
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data 	Event data object
		 * @returns {void}
		 */
		addToCart: function (e, data) {
			e.stopPropagation();
			var self = this;

			ips.getAjax()( data.url, {
				data: data.formData + '&registerCheckout=1',
				type: 'post'
			})
				.done( function (response) {
					self._infoPane.html( response.dialog );
					$( document ).trigger( 'contentChange', [ self._infoPane ] );
				})
				.fail(function(response){
					
					var loadingElem = self.scope.find('form').next('.ipsLoading');
					loadingElem.remove();
					
					if ( response.responseJSON ) {
						ips.ui.alert.show({
							type: 'alert',
							message: response.responseJSON,
							icon: 'warn'
						});
					} else {
						var form = $(e.target).find('form');
						try {
							var newForm = $(response.responseText);
						} catch (err) {
							form.attr('data-noajax', 'true');
							form.trigger('submit');
						}
						form.replaceWith( newForm );
						$( document ).trigger('contentChange' ); 
					}
				});
		},
	});
}(jQuery));