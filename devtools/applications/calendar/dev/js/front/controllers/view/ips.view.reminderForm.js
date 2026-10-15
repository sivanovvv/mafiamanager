/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.calendar.reminderButton.js - Controller for reminder button
 *
 * Author: Andrew Millne
 */
;( function($){
	"use strict";

	ips.controller.register('calendar.front.view.reminderForm', {

		initialize: function () {
			this.on( 'submit', this.submitForm );
			this.on( 'click', '[data-action="removereminder"]', this.removereminder );
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns 	{void}
		 */
		setup: function () {
		},

		/**
		 * Event handler for removing reminder
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		removereminder: function (e) {
			e.preventDefault();
			this._doRemindAction( $( e.currentTarget ).attr('href'), {}, true );
		},

		/**
		 * Event handler for submitting the reminder form
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		submitForm: function (e) {
			e.preventDefault();
			this._doRemindAction( this.scope.attr('action'), this.scope.serialize(), false );
		},

		/**
		 * Performs an ajax action.
		 *
		 * @param 		{string} 	url		URL to call
		 * @param 		{object} 	data 	Object of data to include in the request
		 * @returns 	{void}
		 */
		_doRemindAction: function (url, data, removereminder ) {
			var self = this;
			var dims = ips.utils.position.getElemDims( this.scope.parent('div') );

			// Set it to loading
			this.scope
				.hide()
				.parent('div')
					.css({
						width: dims.outerWidth + 'px',
						height: dims.outerHeight + 'px'
					})
					.addClass('ipsLoading');

			// Update reminder preference via ajax
			ips.getAjax()( url, {
				data: data,
				type: 'post'
			})
				.done( function (response, status, jqXHR) {

					if( jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormError: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormNoSubmit: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formerror: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formnosubmit: true') !== -1 ){
						self.scope
							.show()
							.html( response )
							.parent('div')
								.removeClass('ipsLoading')
								.css({
									width: 'auto',
									height: 'auto'
								});
					} else {
						// Success, so trigger event to update button
						self.trigger('reminderItem');
						if( removereminder ) {
							ips.ui.flashMsg.show(ips.getString('event_reminder_removed'));
						}
						else {
							ips.ui.flashMsg.show(ips.getString('event_reminder_added'));
						}

						self.scope.parents('.ipsHovercard').remove();
					}
				})
				.fail( function (jqXHR, textStatus, errorThrown) {
					window.location = url;
				})
				.always( function () {
					// If we're in a hovercard, remove it					
				});
		}
	});
}(jQuery));
