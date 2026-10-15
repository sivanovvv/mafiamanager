/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.ignoredComments.js - Controller to handle ignored comments
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.ignoredComments', {

		initialize: function () {
			this.on( 'menuItemSelected', '[data-action="ignoreOptions"]', this.commentIgnore );
		},

		/**
		 * Ignore options
		 *	
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		commentIgnore: function (e, data = e.detail) {
			switch( data.selectedItemID ){
				case 'showPost':
					data.originalEvent.preventDefault();
					this._showHiddenPost( e, data );
				break;
				case 'stopIgnoring':
					data.originalEvent.preventDefault();
					this._stopIgnoringFromComment( e, data );
				break;
			}
		},
		
		/**
		 * Shows a hidden post
		 *	
		 * @param 		{event} 	e 		Event object from the event handler
		 * @param 		{object}	data 	Event data object from the event handler
		 * @returns 	{void}
		 */
		_showHiddenPost: function (e, data) {
			// Hide the ignore row
			var ignoreRow = $( data.triggerElem ).closest('.ipsEntry--ignored');
			var commentID = ignoreRow.attr('data-ignoreCommentID');
			var comment = this.scope.find( '#' + commentID );

			ignoreRow.remove();
			comment.removeClass('ipsHide');
		},

		/**
		 * Stops ignoring posts by a user
		 *	
		 * @param 		{event} 	e 		Event object from the event handler
		 * @param 		{object}	data 	Event data object from the event handler
		 * @returns 	{void}
		 */
		_stopIgnoringFromComment: function (e, data) {
			var ignoreRow = $( data.triggerElem ).closest('.ipsEntry--ignored');
			var userID = ignoreRow.attr('data-ignoreUserID');
			var self = this;
			var posts = this.scope.find('[data-ignoreUserID="' + userID + '"]');

			posts.each( function () {
				self.scope.find( '#' + $( this ).attr('data-ignoreCommentID') ).removeClass('ipsHide');
				$( this ).remove();
			});

			var url = ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=ignore&do=ignoreType&type=topics&off=1&csrfKey=' + ips.getSetting('csrfKey');

			ips.getAjax()( url, {
				data: {
					member_id: parseInt( userID )
				}
			})
				.done( function () {
					ips.ui.flashMsg.show( ips.getString('ignore_prefs_updated') );
				})
				.fail( function () {
					window.location = url + '&member_id=' + userID;
				});
		}
	});
}(jQuery));