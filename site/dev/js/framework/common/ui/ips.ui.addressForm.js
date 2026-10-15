/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.addressForm.js - Address form element widget
 *
 * Author: Matt Finger
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.addressForm', function(){

		/**
		 * @typedef {{minimize?: boolean, country?: string, requireFullAddress?: boolean}} AddressFormOptions
		 */

		/**
		 *
		 * @type {AddressFormOptions}
		 */
		const defaults = {
			minimize: false,
			country: "",
			requireFullAddress: true
		};

		/**
		 *
		 * @param {jQuery}	elem
		 * @param {AddressFormOptions}	options
		 * @param {Event|undefined}		[e]
		 */
		function respond(elem, options, e) {
			// Don't reinitialize an existing address field
			if( elem.data('initialized') !== undefined ){
				return;
			}

			options = { ...defaults, ...options };

			if( options.minimize ){
				minimizeAddress( elem, options );
			} else {
				init( elem, options, e );
			}

			elem.data('initialized', true);
		}

		/**
		 *
		 * @param elem
		 * @param options
		 * @param e
		 */
		function init(elem, options, e) {
			// Watch for country changes (so we can change state/region to a select box if appropriate
			elem.on( 'change', '[data-role="countrySelect"]', countryChange.bind( e, elem, options ) );
			$( elem ).find('[data-role="countrySelect"]').trigger('change');

			// Add a + button for address lines
			recalculateAddAddressLineButton( elem );
		}

		/**
		 * Setup an address form where all the fields are collapsed except for the address line 1. When clicking it, the other options appear and google maps is used to create suggestions
		 *
		 * @param {jQuery}				elem
		 * @param {AddressFormOptions}	options
		 */
		function minimizeAddress(elem, options) {
			const tempInput = $('<input/>')
				.attr('type', 'text')
				.attr('data-role', 'minimizedVersion')
				.addClass('ipsInput')
				.attr('placeholder', ips.getString('specifyLocation'))
				.on('focus', function (e) {
					// Hide the minimized version
					$(this).hide();

					// Set country if applicable
					if (options.country) {
						$(elem).find('[data-role="countrySelect"]').val(options.country);
					}

					// Init
					init(elem, options, e);

					// Show the main address fields
					elem.show().find('input').first().trigger('focus');
				});

			const value = [];

			// Build the existing value
			elem.find('input, select').each( function () {
				if( $( this ).val() ){
					if( $( this ).is('select') ){
						value.push( $( this ).find('option[value="' + $( this ).val() + '"]').text().trim() );
					} else {
						value.push( $( this ).val().trim() );
					}
				}

			});

			if (value.length) {
				tempInput.val(value.join(', '));
			}

			elem
				.hide()
				.after( tempInput );
		}

		/**
		 * Handle updates based on the country input being changed. This is also invoked when the module is first initialized to set it up
		 *
		 * @param {jQuery}				elem
		 * @param {AddressFormOptions}	options
		 * @param {Event}				e
		 */
		function countryChange(elem, options, e) {
			ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=ajax&do=states&country=' + $(e.target).val() )
				.done( function (response) {
					let regionSelect;
					let regionText;
					if (response.length) {
						if( !$( elem ).find('[data-role="regionSelect"]').length )
						{
							regionText = $( elem ).find('[data-role="regionText"]');
						}
						else
						{
							regionText = $(elem).find('[data-role="regionSelect"]');
						}

						regionSelect = $('<select class="ipsInput" data-role="regionSelect" />');

						regionSelect.attr( 'name', regionText.attr('name') );

						if ( !options.requireFullAddress ) {
							regionSelect.append( $('<option />').attr( 'value', '' ).html( $( elem ).find('[data-role="regionText"]').attr('placeholder') ) );
						}

						response.forEach?.(region => {
							regionSelect.append( $('<option />').attr('value', region).html(region) );

							if (region.toLowerCase() === regionText.val().toLowerCase() ){
								regionSelect.val(region);
							}
						})

						regionText.replaceWith(regionSelect);
					} else {
						if (!$( elem ).find('[data-role="regionText"]').length) {
							regionSelect = $(elem).find('[data-role="regionSelect"]');
							regionText = $('<input type="text" data-role="regionText" placeholder="' + ips.getString('address_region') + '" />');

							regionText.attr( 'name', regionSelect.attr('name') ).val( "" );
							regionSelect.replaceWith( regionText );
						}
					}
				} );

			if (typeof elem.attr('data-ipsAddressForm-googlePlaces') === 'string') {
				ips.ui.map.afterGoogleMapsLoaded(() => googlePlacesInit(elem))
			}
		}

		/**
		 * Adds an address line to an address form input
		 *
		 * @param {jQuery} elem
		 * @param {string}	value
		 */
		function addAddressLine(elem, value) {
			const lastLine = elem.find('[data-role="addressLine"]').closest('li').last();
			const newLine = lastLine.clone();

			if (value) {
				newLine.find('input').trigger('focus').val( value );
			}

			lastLine.after(newLine);
		}

		/**
		 * Setup the add address line button; sets up the click handler
		 * @param {jQuery}	elem
		 */
		function recalculateAddAddressLineButton(elem) {
			elem.find( '[data-role="addAddressLine"]' ).remove();
			const button = $('<i class="fa fa-plus" style="cursor:pointer; margin-inline-start: 4px" data-role="addAddressLine">');

			button.on('click', function () {
				addAddressLine(elem, '');
				recalculateAddAddressLineButton(elem);
			});

			elem.find('[data-role="addressLine"]').last().after( button );
		}

		/**
		 * Initialize the autocomplete suggestions widget
		 *
		 * @param {jQuery}	elem
		 */
		function googlePlacesInit(elem) {
			const googlePlacesInput = $(elem).find('[data-role="addressLine"]').first();
			const options = {
				types: ['geocode'],
				componentRestrictions: {country: $(elem).find('[data-role="countrySelect"]').val()}
			};

			if (!options.componentRestrictions.country) {
				delete options.componentRestrictions
			}

			const autocomplete = new google.maps.places.Autocomplete(googlePlacesInput.get(0), options);

			googlePlacesInput.on( 'focus', function () {
				if( navigator.geolocation ){
					navigator.geolocation.getCurrentPosition( function (position) {
						const geolocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
						autocomplete.setBounds( new google.maps.LatLngBounds( geolocation, geolocation ) );
					});
				}
			} );
			googlePlacesInput.on( 'keypress', function(e) {
				if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
					return false;
				}
			} );

			google.maps.event.addListener( autocomplete, 'place_changed', function () {
				const place = autocomplete.getPlace();

				for (let i = 0; i < $( elem ).find('[data-role="addressLine"]').length; i++) {
					$( elem ).find('[data-role="addressLine"]').val( '' );
				}
				const parsedAddress = $('<div>' + place.adr_address + '</div>');

				const addressLines = [];
				let existingAddressLines = $(elem).find('[data-role="addressLine"]').length;
				if ( parsedAddress.find('.post-office-box').length ) {
					addressLines.push( parsedAddress.find('.post-office-box').text() );
				}
				if ( parsedAddress.find('.street-address').length ) {
					addressLines.push( parsedAddress.find('.street-address').text() );
				}
				if ( parsedAddress.find('.extended-address').length ) {
					addressLines.push( parsedAddress.find('.extended-address').text() );
				}

				for (let i = 0; i < addressLines.length; i++) {
					if( existingAddressLines ){
						$( elem ).find('[data-role="addressLine"]').eq(i).trigger('focus').val( addressLines[i] );
						existingAddressLines--;
					} else {
						addAddressLine(elem, addressLines[i]);
					}
				}

				if (parsedAddress.find('.locality') ) {
					elem.find('[data-role="city"]').trigger('focus').val( parsedAddress.find('.locality').text() );
				}

				if (parsedAddress.find('.region')) {
					elem.find('[data-role="regionText"]').trigger('focus').val( parsedAddress.find('.region').text() );

					if ( elem.find('[data-role="regionSelect"] option[value="' + parsedAddress.find('.region').text() + '"]').length ) {
						elem.find('[data-role="regionSelect"]').val( parsedAddress.find('.region').text() );
					} else {
						for (let i in place.address_components ) {
							if ( place.address_components[i].types[0] === 'administrative_area_level_1' || place.address_components[i].types[0] === 'administrative_area_level_2' ) {
								if ( elem.find('[data-role="regionSelect"] option[value="' + place.address_components[i].long_name + '"]').length ) {
									elem.find('[data-role="regionSelect"]').val( place.address_components[i].long_name );
									break;
								} else if ( elem.find('[data-role="regionSelect"] option[value="' + place.address_components[i].short_name + '"]').length ) {
									elem.find('[data-role="regionSelect"]').val( place.address_components[i].short_name );
									break;
								}
							}
						}
					}
				}

				if (parsedAddress.find('.postal-code')) {
					elem.find('[data-role="postalCode"]').trigger('focus').val( parsedAddress.find('.postal-code').text() );
				}
			});
		}

		// Register this module as a widget to enable the data API and
		// jQuery plugin functionality
		ips.ui.registerWidget( 'addressForm', ips.ui.addressForm, ['minimize','country','requireFullAddress'] );

		return {
			respond
		};
	});
}(jQuery));