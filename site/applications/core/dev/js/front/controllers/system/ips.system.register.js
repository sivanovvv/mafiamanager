/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.register.js - Registration controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.system.register', {

		usernameField: null,
		timers: { 'username': null, 'email': null },
		ajax: ips.getAjax(),
		popup: null,
		passwordBlurred: true,
		dirty: false,
		initialize: function () {
			this.on( 'keyup', '#elInput_username', this.changeUsername );
			this.on( 'blur', '#elInput_username', this.changeUsername );
			this.on( 'keyup', '#elInput_password_confirm', this.confirmPassword );
			this.on( 'blur', '#elInput_password_confirm', this.confirmPassword );
			this.on( 'click', 'a[data-ipsPbrCancel]', this.cancelPbr );
			this.setup();
		},

		/**
		 * Setup method
		 * Loads the template file for registration, and adds an empty element after the username field
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		setup: function () {
			this.usernameField = this.scope.find('#elInput_username');
			this.passwordField = this.scope.find('#elInput_password');
			this.confirmPasswordField = this.scope.find('#elInput_password_confirm');
			this.confirmPasswordError = this.scope.find('#elInput_password_confirm--error');
		},

		/**
		 * Cancel the post before register submission
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		cancelPbr: function (e) {
			var url = $(e.target).closest('[data-ipsPbrCancel]').attr('href');
			
			e.preventDefault();
			e.stopPropagation();
			
			/* Show confirmation Prompt */
			ips.ui.alert.show({
				type: 'confirm',
				message: ips.getString('pbr_confirm_title'),
				subText: ips.getString('pbr_confirm_text'),
				icon: 'warn',
				buttons: {
					ok: ips.getString('pbr_confirm_ok'),
					cancel: ips.getString('pbr_confirm_cancel')
				},
				callbacks: {
					ok: function(){
						window.location = url;
					},
					cancel: function(){
						return false;
					}
				}
			});
		},
		
		/**
		 * Event handler for a change on the username field
		 * Waits 700ms, then calls this._doCheck
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		changeUsername: function (e) {
			if( this.timers['username'] ){
				clearTimeout( this.timers['username'] );
			}

			if( this.usernameField.val().length > 4 || e.type != "keyup" ){
				this.timers['username'] = setTimeout( this._doCheck.bind( this, this.usernameField ), 700 );
			} else {
				this._clearResult( this.usernameField );
			}
		},

		/**
		 * Event handler for a change on the confirm password field
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		confirmPassword: function (e) {
			this._clearResult( this.confirmPasswordField );
			if( this.passwordField.val() && this.passwordField.val() === this.confirmPasswordField.val() ){
				this.confirmPasswordField.addClass('ipsField_success');
				this.confirmPasswordError.html('');
			} else if( e.type === "focusout" ){
				this.confirmPasswordField.addClass('ipsField_error');
				this.confirmPasswordError.html(ips.getString('password_mismatch'));
				document.getElementById('ipsAriaLive').innerHTML = ips.getString('password_mismatch');
			}
		},

		/**
		 * Clears a previous validation result
		 *
		 * @returns 	{void}
		 */
		_clearResult: function (field) {
			field
				.removeClass('ipsField_error')
				.removeClass('ipsField_success')
				.next('.ipsFieldRow__warning')
					.html('');

			field
				.closest('.ipsFieldRow')
					.removeClass('ipsFieldRow_error');
		},

		/**
		 * Fires an ajax request to check whether the username is already in use
		 * Updates the result element depending on the result
		 *
		 * @returns 	{void}
		 */
		_doCheck: function ( field ) {
			var value = field.val();
			var resultElem = field.next('.ipsFieldRow__warning');

			if( this.ajax && this.ajax.abort ){
				this.ajax.abort();
			}

			// Set loading
			field.addClass('ipsField_loading');

			// Do ajax
			this.ajax( ips.getSetting('baseURL') + '?app=core&module=system&controller=ajax&do=usernameExists', {
				dataType: 'json',
				data: {
					input: encodeURIComponent( value )
				}
			})
				.done( function (response) {
					if( response.result == 'ok' ){
						resultElem.html('');
						field.removeClass('ipsField_error').addClass('ipsField_success').removeAttr('aria-invalid');
						field.closest(".ipsFieldRow_error").removeClass("ipsFieldRow_error");
					} else {
						resultElem.html( response.message );
						document.getElementById('ipsAriaLive').innerHTML = response.message;
						field.removeClass('ipsField_success').addClass('ipsField_error').attr('aria-invalid', 'true');
						field.closest(".ipsFieldRow").addClass("ipsFieldRow_error");
					}
				})
				.fail( function () {} )
				.always( function () {
					field.removeClass('ipsField_loading');
				});
		}
	});
}(jQuery));