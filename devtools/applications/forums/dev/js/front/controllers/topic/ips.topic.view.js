/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.topic.view.js - Topic view controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('forums.front.topic.view', {

		initialize: function () {
			$( document ).on( 'replyToTopic', this.replyToTopic.bind(this) );
			this.on( 'paginationClicked', this.paginationClicked );
			this.on( 'click', '[data-action="showMoreActivity"]', this.showActivity );
			this.on( 'click', '[data-action="closeMoreActivity"]', this.hideActivity );
		},

		/**
		 * Hide any helpful filters on page one
		 *
		 * @param 	{event} 	e 		Event object
		 * @param 	{object} 	data	Data object
		 * @returns {void}
		 */
		paginationClicked: function ( e, data ) {
			document.getElementById('ipsTopicView').dataset.ipsTopicFirstPage = ( data.pageNo == 1 );
		},
			
		/**
		 * Opens up the activity box when placed under the first post
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		showActivity: function (e) {
			e.preventDefault();

			this.scope.find('[data-role="moreActivity"]').show();
			this.scope.find('[data-action="showMoreActivity"]').hide();
			this.scope.find('[data-action="closeMoreActivity"]').show();
		},
		
		/**
		 * Closes the activity box when placed under the first post
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		hideActivity: function (e) {
			e.preventDefault();
			
			this.scope.find('[data-role="moreActivity"]').hide();
			this.scope.find('[data-action="showMoreActivity"]').show();
			this.scope.find('[data-action="closeMoreActivity"]').hide();
		},
		
		/**
		 * Triggers the initialize event on the editor
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		replyToTopic: function (e) {
			ips.ui.editorv5.getObjWithInit( this.scope.find('[data-role="replyArea"] [data-ipsEditorv5]'), function(editor){
				editor.unminimize(function(){
					editor.focus();
				});
			} );
		}
	});
}(jQuery));