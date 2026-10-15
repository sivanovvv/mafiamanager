/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.calendar.reminderButton.js - Controller for event reminder button
 *
 * Author: Andrew Millne
 */
;( function($){
	"use strict";

	ips.controller.register('calendar.front.view.reminderButton', {

		initialize: function () {
			this.setup();
			this.on( document, 'reminderItem', this.reminderItemChange );
		},

		setup: function () {
			this._id = this.scope.attr('data-reminderID');
			this._button = this.scope.find('[data-role="reminderButton"]');
		},

		/**
		 * Responds to events indicating the reminder status has changed
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		reminderItemChange: function (e, data) {
			this._reloadButton();
		},

		/**
		 * Gets a new reminder button from the server and replaces the current one with the response
		 *
		 * @returns 	{void}
		 */
		_reloadButton: function () {
			// Show button as loading
			this._button.addClass('i-opacity_3');
			
			var self = this;
			var pos = ips.utils.position.getElemPosition( this._button );
			var dims = ips.utils.position.getElemDims( this._button );

			this.scope.append( ips.templates.render('calendar.reminder.loading') );

			// Adjust sizing
			this.scope
				.css({
					position: 'relative'
				})
				.find('.ipsLoading')
					.css({
						width: dims.outerWidth + 'px',
						height: dims.outerHeight + 'px',
						top: "0",
						left: "0",
						position: 'absolute',
						zIndex: ips.ui.zIndex()
					});

			// Load new contents
			ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=calendar&module=calendar&controller=event&do=reminderButton', {
				data: Object.assign({
					id: this._id
				}, ( this.scope.attr('data-buttonType') ) ? { button_type: this.scope.attr('data-buttonType') } : {} )
			})
				.done( function (response) {
					self.scope.html( response );
					$( document ).trigger( 'contentChange', [ self.scope ] );
				})
				.fail( function () {
					self._button.removeClass('i-opacity_3');
				})
				.always( function () {
					self.scope.find('.ipsLoading').remove();
				});
		}
	});
}(jQuery));