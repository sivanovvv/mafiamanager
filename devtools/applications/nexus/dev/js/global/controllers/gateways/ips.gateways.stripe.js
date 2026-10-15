/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.gateways.stripe.js - Stripe controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.global.gateways.stripe', {
		
		stripe: null,
		cardNumber: null,
		
		/**
		 * Init
		 */
		initialize: function () {
			this.on( $(this.scope).closest('form')[0], 'submit', this.submitForm );

			if( "Stripe" in window )
			{
				this.setup();
			}
			else
			{
				ips.loader.get(['https://js.stripe.com/v3/']).then( function () {
					this.setup();
				}.bind(this));
			}
		},
		
		/**
		 * Init
		 */
		setup: function(){

			this.stripe = Stripe( this.scope.attr('data-key') );

			var elements = this.stripe.elements()
			this.cardNumber = elements.create('cardNumber', {
				'placeholder': '',
				'style': {
					'invalid': {
						'color': 'inherit'
					}
				}
			});
			this.cardNumber.mount( '#elInput_' + $(this.scope).attr('data-id') + '-' + $(this.scope).attr('data-id') + '_card-number' );
			this.cardNumber.addEventListener('change', function(event) {
				if ( event.error ) {
					this.scope.find('[data-role="dummyCard"]').addClass('ipsFieldRow_error');
					this.scope.find('[data-warning="number"]').text( event.error.message );
				} else {
					this.scope.find('[data-role="dummyCard"]').removeClass('ipsFieldRow_error');
					this.scope.find('[data-warning="number"]').text('');
				}
				
				if ( event.brand != 'unknown' ) {
					this.scope.find('.cPayment').css( 'opacity', 0.3 );
					switch ( event.brand ) {
						case 'visa':
							this.scope.find('.cPayment_visa').css( 'opacity', 1 );
							break;
						case 'mastercard':
							this.scope.find('.cPayment_mastercard').css( 'opacity', 1 );
							break;
						case 'amex':
							this.scope.find('.cPayment_american_express').css( 'opacity', 1 );
							break;
						case 'discover':
							this.scope.find('.cPayment_discover').css( 'opacity', 1 );
							break;
						case 'diners':
							this.scope.find('.cPayment_diners_club').css( 'opacity', 1 );
							break;
						case 'jcb':
							this.scope.find('.cPayment_jcb').css( 'opacity', 1 );
							break;
					}
				} else {
					this.scope.find('.cPayment').css( 'opacity', 1 );
				}
			}.bind(this) );
			
			var cardExp = elements.create('cardExpiry', {
				'style': {
					'invalid': {
						'color': 'inherit'
					}
				}
			});
			cardExp.mount( '#elInput_' + $(this.scope).attr('data-id') + '-' + $(this.scope).attr('data-id') + '_card-exp' );
			cardExp.addEventListener('change', function(event) {
				if ( event.error ) {
					this.scope.find('[data-role="dummyExp"]').addClass('ipsFieldRow_error');
					this.scope.find('[data-warning="exp"]').text( event.error.message );
				} else {
					this.scope.find('[data-role="dummyExp"]').removeClass('ipsFieldRow_error');
					this.scope.find('[data-warning="exp"]').text('');
				}
			}.bind(this) );
			
			var cardCvc = elements.create('cardCvc', {
				'placeholder': '',
				'style': {
					'invalid': {
						'color': 'inherit'
					}
				}
			});
			cardCvc.mount( '#elInput_' + $(this.scope).attr('data-id') + '-' + $(this.scope).attr('data-id') + '_card-ccv' );
			cardCvc.addEventListener('change', function(event) {
				if ( event.error ) {
					this.scope.find('[data-role="dummyCcv"]').addClass('ipsFieldRow_error');
					this.scope.find('[data-warning="ccv"]').text( event.error.message );
				} else {
					this.scope.find('[data-role="dummyCcv"]').removeClass('ipsFieldRow_error');
					this.scope.find('[data-warning="ccv"]').text('');
				}
			}.bind(this) );
						
			this.scope.show();
		},
		
		/**
		 * Submit form action
		 *
		 * @param		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		submitForm: function(e) {
			
			var scope = $(this.scope);
									
			if ( !$(e.currentTarget).find( 'input[type="radio"][name="payment_method"]' ).length || $(e.currentTarget).find( 'input[name="payment_method"][value="' + $(this.scope).attr('data-id') + '"]' ).is(':checked') ) {
					
				/* Already submitted */
				if ( $(e.currentTarget).find('input[name="'+$(this.scope).attr('data-id')+'_card[token]"]').length ) {
					return;
				}
																				
				/* Stop the form from actually submitting */
				e.preventDefault();
				e.stopPropagation();
								
				/* Hide any previous errors */
				scope.find('[data-warning]').text('');
								
				/* Show the loading icon */
				var loading = scope.closest('[data-ipswizard]').find('[data-role="loading"]');
				var wizardContainer = scope.closest('[data-ipswizard]').find('[data-role="wizardContent"]');
				if( !loading.length ){
					loading = $('<div/>').attr('data-role', 'loading').addClass('ipsLoading').hide();
					scope.closest('[data-ipswizard]').append( loading );
				}
				var dims = {
					width: wizardContainer.outerWidth(),
					height: wizardContainer.outerHeight()
				};
				loading
					.css({
						width: dims.width + 'px',
						height: dims.height + 'px'
					})
					.show();
				wizardContainer
					.hide()
					.after( loading.show() );
					
				/* Stored card */
				var savedCardId = $(this.scope).find('input[name="'+$(this.scope).attr('data-id')+'_card[stored]"]:checked').val();
				if ( savedCardId > 0 ) {
					this.createPaymentIntent( savedCardId );
				}
				
				/* New card */
				else {
					var data = { billing_details: { address: {} } };
					if ( scope.attr('data-city') ) {
						data.billing_details.address.city = scope.attr('data-city');
					}
					if ( scope.attr('data-country') ) {
						data.billing_details.address.country = scope.attr('data-country');
					}
					if ( scope.attr('data-address1') ) {
						data.billing_details.address.line1 = scope.attr('data-address1');
					}
					if ( scope.attr('data-address2') ) {
						data.billing_details.address.line2 = scope.attr('data-address2');
					}
					if ( scope.attr('data-zip') ) {
						data.billing_details.address.postal_code = scope.attr('data-zip');
					}
					if ( scope.attr('data-state') ) {
						data.billing_details.address.state = scope.attr('data-state');
					}
					if ( scope.attr('data-email') ) {
						data.billing_details.email = scope.attr('data-email');
					}
					if ( scope.attr('data-name') ) {
						data.billing_details.name = scope.attr('data-name');
					}
					if ( scope.attr('data-phone') ) {
						data.billing_details.phone = scope.attr('data-phone');
					}
					
					if ( scope.attr('data-amount') && parseFloat( scope.attr('data-amount') ) > 0 ) {
						this.stripe.createPaymentMethod( 'card', this.cardNumber, data ).then( this.receivedCardPaymentMethod.bind(this) );
					} else {
						this.stripe.handleCardSetup( scope.attr('data-setupSecret'), this.cardNumber, { payment_method_data: data } ).then( function( result ){
							if (result.error) {
								Debug.error(result.error);
								loading.remove();
								wizardContainer.show();
								ips.ui.alert.show({
									type: 'alert',
									icon: 'warn',
									message: result.error.message
								});
							} else {
								scope.closest('form').append( $('<input type="hidden" />').attr( 'name', scope.attr('data-id') + '_card[token]' ).val( result.setupIntent.payment_method ) );
								scope.closest('form').trigger('submit');
							}
						} );
					}
				}
			}
		},
		
		/**
		 * Create payment intent
		 *
		 * @param		{mixed} 	paymentMethodId		A Stripe payment method ID or a stored card ID
		 * @returns 	{void}
		 */
		createPaymentIntent: function( paymentMethodId ) {
			var scope = $(this.scope);
			var loading = scope.closest('[data-ipswizard]').find('[data-role="loading"]');
			var wizardContainer = scope.closest('[data-ipswizard]').find('[data-role="wizardContent"]');
						
			ips.getAjax()( scope.closest('form').attr('action'), {
				method: 'post',
				data: {
					createPaymentIntent: paymentMethodId,
					savePaymentMethod: $( '#el' + scope.attr('data-id') + '_cardSave' ).prop('checked'),
				}
			} )
			.done(function(response){
				if ( response.response.status === 'requires_action' ) {
					this.stripe.handleCardAction(
						response.response.client_secret
					).then(function(result) {
						if (result.error) {
							console.error(result.error);
							loading.remove();
							wizardContainer.show();
							ips.ui.alert.show({
								type: 'alert',
								icon: 'warn',
								message: result.error.message
							});
						} else {
							scope.closest('form').append( $('<input type="hidden" />').attr( 'name', scope.attr('data-id') + '_card[token]' ).val( response.response.id ) );
							scope.closest('form').trigger('submit');
						}
					});
				} else {
					scope.closest('form').append( $('<input type="hidden" />').attr( 'name', scope.attr('data-id') + '_card[token]' ).val( response.response.id ) );
					scope.closest('form').trigger('submit');
				}
			}.bind(this))
			.fail(function(response){
				console.error(response);
				loading.remove();
				wizardContainer.show();
				ips.ui.alert.show({
					type: 'alert',
					icon: 'warn',
					message: ips.getString('payment_error')
				});
			}.bind(this));
		},
		
		/**
		 * Callback after a Stripe Payment Method has been generated for a card
		 *
		 * @param		{object} 	result	The result
		 * @returns 	{void}
		 */
		receivedCardPaymentMethod: function( result ) {
									
			/* Init */
			var scope = $(this.scope);
			var loading = scope.closest('[data-ipswizard]').find('[data-role="loading"]');
			var wizardContainer = scope.closest('[data-ipswizard]').find('[data-role="wizardContent"]');
						
			/* If there was an error, show the form again */
			if ( result.error ) {
				Debug.error(result.error);
				
				loading.remove();
				wizardContainer.show();
				
				if ( result.error.type == 'card_error' || result.error.type == 'validation_error' ) {
					ips.ui.alert.show({
						type: 'alert',
						icon: 'warn',
						message: result.error.message
					});
				} else {
					ips.ui.alert.show({
						type: 'alert',
						icon: 'warn',
						message: ips.getString('payment_error')
					});
				}
			}
			/* Otherwise, process... */
			else {
				this.createPaymentIntent( result.paymentMethod.id );
			}
		},
				
		/**
		 * Callback when the status of a source changes (i..e the customer has paid, or too much time has passed for them to be able to pay)
		 *
		 * @param		{int} 		status 		Status Code
		 * @param		{Source} 	source 		Stripe Source object
		 * @returns 	{void}
		 */
		pollCallback: function( status, source ) {
			if ( source.status !== 'pending' ) {
				$(this.scope).closest('form').trigger('submit');
			}
		}
		
	});
}(jQuery));