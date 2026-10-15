/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.followButton.js - Controller for follow button
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.followButton', {

		initialize: function () {
			this.setup();
			this.on( document, 'followingItem', this.followingItemChange );
		},

		setup: function () {
			this._app = this.scope.attr('data-followApp');
			this._area = this.scope.attr('data-followArea');
			this._id = this.scope.attr('data-followID');
			this._feedID = this._area + '-' + this._id;
			this._button = this.scope.find('[data-role="followButton"]');
		},

		/**
		 * Responds to events indicating the follow status has changed. We want to reload the button HTML and fetch any data layer events if there are any
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		followingItemChange: function (e, data) {
			if( data.feedID === this._feedID ){
				document.body.dispatchEvent(new CustomEvent('ipsDataLayerSync', {bubbles:true}));
				this._reloadButton();
			}
		},

		/**
		 * Gets a new follow button from the server and replaces the current one with the response
		 *
		 * @returns 	{void}
		 */
		_reloadButton: function () {
			// Show button as loading
			this._button.addClass('i-opacity_3');
			
			var self = this;
			var pos = ips.utils.position.getElemPosition( this._button );
			var dims = ips.utils.position.getElemDims( this._button );

			this.scope.append( ips.templates.render('core.follow.loading') );

			// Adjust sizing
			this.scope
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
			ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=notifications&do=button', {
				data: Object.assign({
					follow_app: this._app,
					follow_area: this._area,
					follow_id: this._id,
				},
					( this.scope.attr('data-buttonType') ) ? { button_type: this.scope.attr('data-buttonType') } : {},
					( this.scope.attr('data-buttonSize') ) ? { button_size: this.scope.attr('data-buttonSize') } : {}
				)
			})
				.done( function (response) {
					self.scope.html( response );
					$( document ).trigger( 'contentChange', [ self.scope ] );
					
					/* Any auto follow toggles on the page? */
					if ( $('input[data-toggle-id="auto_follow_toggle"]').length ) {
						var val = self.scope.find('[data-role="followButton"]').attr('data-following');
						if ( val == 'false' && $('input[data-toggle-id="auto_follow_toggle"]').is(':checked') ) {
							$('input[data-toggle-id="auto_follow_toggle"]').prop('checked', false).trigger('change');
						} else if (val == 'true' && ! $('input[data-toggle-id="auto_follow_toggle"]').is(':checked') ){
							$('input[data-toggle-id="auto_follow_toggle"]').prop('checked', true).trigger('change');
						}
					}
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