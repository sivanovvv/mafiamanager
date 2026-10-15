/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.wizard.js - Wizard widget
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.wizard', function(){
		
		var respond = function (elem, options, e) {
			elem.on( 'click', '[data-action="wizardLink"]', refresh.bind( e, elem ) );
			elem.on( 'submit', 'form', refresh.bind( e, elem ) );
		};
		
		/**
		 * Reloads a page of the wizard
		 *
		 * @param 		{element} 	elem 	The wizard element
		 * @param		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		var refresh = function(elem, e) {
			var target = $( e.currentTarget );
			
			_showLoading( elem );
						
			if( target.is('form') ){
				if( target.attr('data-bypassAjax') ){
					return true;
				}

				// Stop all the propagations too because the wizard could be inside a menu or a dialog which have their own listeners on the submit events.
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				var data = target.serialize() + '&_wizardHeight=' + elem.find('[data-role="loading"]').outerHeight();

				// Include the value of any button clicked
				if( e.originalEvent && e.originalEvent.submitter && e.originalEvent.submitter.name && e.originalEvent.submitter.value ) {
					data += '&' + e.originalEvent.submitter.name + '=' + e.originalEvent.submitter.value;
				}

				ips.getAjax()( target.attr('action'), {
					data: data,
					type: 'post'
				}).done( function (response) {
					_insertHtml( response, elem );
				})
				.fail(function(response, textStatus, errorThrown){
					target.attr( 'data-bypassAjax', true );
					target.trigger('submit');
				})
			} else {
				e.preventDefault();
				
				ips.getAjax()( target.attr('href') ).done( function (response) {
					_insertHtml( response, elem );
				});
			}
			
		},

		/**
		 * Get wizard response HTML (including assets) and insert
		 *
		 * @param		{string}	response	HTML response (or, occasionally, an object with a redirect URL)
		 * @param		{element}	elem	The wizard element
		 * @return		{void}
		 */
		 _insertHtml = function (response, elem) {
			// If a json object is returned with a redirect key, send the user there
			if( typeof response === "object" && response !== null && response.redirect ){
				window.location = response.redirect;
				return;
			}

			var responseDiv		= $( '<div>' + response + '</div>' );
			var responseWizard	= responseDiv.find('[data-ipsWizard]').html();
			if ( !responseWizard ) {
				responseWizard = response;
			}

			// Find any CSS or JS references and include them. This is necessary if, e.g., a codemirror form element
			// was included in a wizard step as we need to include its js and CSS files.
			responseDiv.find( "link", "script" ).appendTo( 'head' );

			ips.controller.cleanContentsOf( elem );
			elem.html( responseWizard );
			$( document ).trigger( 'contentChange', [ elem ] );

			elem.trigger( 'wizardStepChanged' );
		 },

		/**
		 * Shows the loading thingy by working out the size of the form its replacing
		 *
		 * @param 		{element} 	elem 	The wizard element
		 * @returns 	{void}
		 */
		_showLoading = function (elem) {
			var loading = elem.find('[data-role="loading"]');
			var formContainer = elem.find('[data-role="wizardContent"]');
			
			if ( !formContainer.is(':visible') ) { // May have already been replaced by a loading indicator in userland code - for example, nexus.global.gateways.stripe does this
				return;
			}

			if( !loading.length ){
				loading = $('<div/>').attr('data-role', 'loading').addClass('ipsLoading').hide();
				elem.append( loading );
			}

			var dims = {
				width: formContainer.outerWidth(),
				height: formContainer.outerHeight()
			};

			loading
				.css({
					width: dims.width + 'px',
					height: dims.height + 'px'
				})
				.show();

			formContainer
				.hide()
				.after( loading.show() );
		},

		/**
		 * Hides the loading thingy
		 *
		 * @returns 	{void}
		 */
		_hideLoading = function () {
			var loading = elem.find('[data-role="loading"]');
			var formContainer = elem.find('[data-role="registerForm"]');

			loading.remove();
			formContainer.show();
		};

		// Register this module as a widget to enable the data API and
		// jQuery plugin functionality
		ips.ui.registerWidget( 'wizard', ips.ui.wizard );

		return {
			respond: respond
		};
	});
}(jQuery));