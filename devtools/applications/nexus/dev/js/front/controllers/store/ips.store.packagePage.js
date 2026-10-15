/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.packagePage.js
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.store.packagePage', {
		
		_productURL: '',

		initialize: function () {
			this.on( 'change', 'select, input[type="radio"], [name="quantity"], [name="renewal_term"]', this.updatePriceAndStock );
			this.on( 'submit', 'form', this.submitForm );
			this.on( 'click', '[data-action="toggleImage"]', this.toggleScreenshot );
			this.on( document, 'addToCart.nexus', this.addToCart );
			this.setup();
		},
		
		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			// Select first image if it's there
			this.scope.find('.cNexusProduct_images [data-action="toggleImage"]').first().addClass('cNexusProduct_imageSelected');
			
			if ( this.scope.find('select,input[type="radio"]').length ) {
				this.updatePriceAndStock();
			}
		},

		/**
		 * Switches the screenshot being shown for a product
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggleScreenshot: function (e) {
			e.preventDefault();

			var clickedImage = $( e.currentTarget );
			var thumbImage = clickedImage.find('img').attr('src');
			var fullImage = clickedImage.attr('href');

			var html = ips.templates.render('nexus.store.productImage', {
				fullURL: fullImage,
				thumbURL: thumbImage
			});

			this.scope
				.find('.cNexusProduct_primaryImage')
					.replaceWith( html )
				.end()
				.find('[data-action="toggleImage"]')
					.removeClass('cNexusProduct_imageSelected');

			clickedImage.addClass('cNexusProduct_imageSelected');

			$( document ).trigger('contentChange', [ this.scope.find('.cNexusProduct_primaryImage').parent() ] ); 
		},

		/**
		 * Event handler for submitting the form, triggering an event that we can capture
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		submitForm: function (e) {

			var self = this;
			var form = this.scope.find('form');
			
			if ( form.attr('data-noajax') ) {
				return true;
			}
			e.preventDefault();
			e.stopPropagation();

			// Set form to loading
			var formDims = ips.utils.position.getElemDims( form );
			var formPos = ips.utils.position.getElemPosition( form );
			var loadingElem = $('<div/>').addClass('ipsLoading');
			form.after( loadingElem );

			loadingElem.css({
				top: formPos.offsetPos.top + 'px',
				left: formPos.offsetPos.left + 'px',
				width: formDims.outerWidth + 'px',
				height: formDims.outerHeight + 'px'
			});

			this._productURL = form.attr('action');

			// Trigger an event for adding to cart, so that we can capture it
			// and do something else with it if necessary
			this.trigger( 'addToCart.nexus', {
				url: this._productURL,
				formData: form.serialize()
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
			
			// Since addToCart is responding to events at document level, we'll potentially be called for multiple
			// products on the page. Check the URL matches the expected one here, and ignore if it's for a different product.
			if( data.url !== this._productURL ){
				return;
			}

			var self = this;
			
			ips.getAjax()( data.url, {
				data: data.formData,
				type: 'post'
			})
				.done( function (response) {
					// Are we already running inside of a dialog?
					if( self.scope.closest('.ipsDialog').length ){
						var dialogContent = self.scope.closest('.ipsDialog').find('.ipsDialog_content');
						// We need to destroy this controller before updating the content so that event handlers are unregistered,
						// otherwise this controller will continue listening for addToCart events and trigger multiple dialogs.
						self.trigger('destroy');						
						dialogContent.html( response.dialog ).show();
						$( document ).trigger( 'contentChange', [ dialogContent ] );
					} else {
						var contentElem = $('<div/>').html( response.dialog );
						var loadingElem = self.scope.find('form').next('.ipsLoading');

						ips.getContainer().append( contentElem );

						// Show a dialog
						var dialogRef = ips.ui.dialog.create({
							title: self.scope.attr('data-itemTitle'),
							content: contentElem,
							forceReload: true,
							size: 'medium'
						});

						dialogRef.show();

						$( document ).trigger( 'contentChange', [ contentElem ] );

						// Remove loading elem
						loadingElem.remove();
						self.updatePriceAndStock();
					}
					
					if ( response.cart ) {
						console.log(response.cart);
						$('#elCart_container').replaceWith( $( '<div>' + response.cart + '</div>' ).find('#elCart_container') );

						let cartCount = $( '<div>' + response.cart + '</div>' ).find('#elCart .ipsNotification').text(),
							showCart = Number(cartCount) > 0;
						
						// Hide or show the cart link in the mobile footer, and update the ipsNotification value
						document.getElementById('elCart_mobileFooterContainer').hidden = !showCart;
						document.querySelector('#elCart_mobileFooterContainer .ipsNotification').textContent = cartCount;

					}

					// Did we get any CSS files to output? 
					// We have to do this last because a stylesheet may be included in the dialog initially but replaced out and no longer exist now
					if( response.css !== undefined )
					{
						self.insertCssUrls( response.css );
					}
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

		/**
		 * Inserts CSS URLs if they are not already in the document
		 *
		 * @returns {void}
		 */
		insertCssUrls: function( urls ) {
			// If we don't have any, return
			if( !urls.length )
			{
				return;
			}

			// Loop over the URLs
			for (const url of urls) {
				let stylesheetURL = url;
				// Build the full URL with the cache bust key
				if( stylesheetURL.indexOf('?') != -1 )
				{
					stylesheetURL = stylesheetURL + '&v=' + ips.getSetting('antiCache');
				}
				else
				{
					stylesheetURL = stylesheetURL + '?v=' + ips.getSetting('antiCache');
				}

				// Now see if it's already in the list of stylesheets loaded for the document. If not, add it, otherwise skip.
				if( !$('link[href="' + stylesheetURL +'"]').length )
				{
					var stylesheet = document.createElement("link");
					stylesheet.setAttribute( "href", stylesheetURL );
					stylesheet.setAttribute( "rel", "stylesheet" );
					stylesheet.setAttribute( "media", "all" );

					$('head')[0].appendChild(stylesheet);

					Debug.log( "Added stylesheet " + stylesheetURL + " to document" );
				}
			};
		},

		/**
		 * Updates the stock and price information when custom fields change
		 *
		 * @returns {void}
		 */
		updatePriceAndStock: function () {
						
			var self = this;
			var form = this.scope.find('form');

			ips.getAjax()( form.attr('action'), {
				dataType: 'json',
				data: form.serialize() + '&stockCheck=1',
				type: 'post'
			})
				.done( function (response) {
					self.scope.find('[data-role="price"]').html( response.price );
					self.scope.find('[data-role="stock"]').html( response.stock );
					self.scope.find('[data-role="renewalTerm"]').html( response.renewal );
					self.scope.find('[data-role="initialTerm"]').html( response.initialTerm );
					if( response.okay ){
						self.scope.find('[type="submit"]').prop('disabled', false).text( ips.getString('add_to_cart_js') );
					} else {
						self.scope.find('[type="submit"]').prop('disabled', true).text( ips.getString('out_of_stock') );
					}
				})
				.fail(function(response){
					Debug.error(response);
				});
		}
				
	});
}(jQuery));