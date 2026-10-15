/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.reaction.js - Reaction handler HAHA THANKS
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.reaction', {

		_reactTypeContainer: null,
		_reactButton: null,
		_reactTypes: null,
		_reactClose: null,
		_ajaxObj: null,

		initialize() {
			this.on( 'click', '[data-role="reactionInteraction"]', this.clickLaunchReaction );
			this.on( 'mouseenter', '[data-role="reactionInteraction"]', this.launchReaction ); 
			this.on( 'mouseleave', '[data-role="reactionInteraction"]', this.unlaunchReaction );
			this.on( 'click', '[data-role="reaction"]', this.clickReaction );
			this.on( 'click', '[data-action="unreact"]', this.unreact );
			this.on( document, 'socket.reaction-count', this._updateReactionCountsFromSocket);

			this._reactTypeContainer = this.scope.find('[data-role="reactionInteraction"]');
			this._reactTypes = this._reactTypeContainer.find('[data-role="reactTypes"]');
			this._reactButton = this._reactTypeContainer.find('[data-action="reactLaunch"]');
			this._reactClose = this._reactTypeContainer.find('[data-action="unreact"]');
			this._reactBlurb = this.scope.find('[data-role="reactionBlurb"]');
			this._reactCount = this.scope.find('[data-role="reactCount"]');
			this._singleReaction = !this._reactTypes.length ;
		},

		/**
		 * Update the reaction based on an event from the socket
		 *
		 * @param {Event}	event		The event being fired
		 * @param {Object}	payload		The data from the socket event
		 * @param {string}	payload.blurb		 The blurb (html) to show
		 * @param {number}	payload.score		The number of reactions
		 * @param {number}	payload.count		The 'reaction count', refer to the \IPS\Content\Reactable PHP Source to see the difference
		 * @param {object}	payload.content	Information about the content item/comment being reacted to
		 * @param {number}	payload.memberReacted	The memberID of the member that reacted
		 *
		 * @returns {Promise<void>}
		 */
		async _updateReactionCountsFromSocket(event, {payload:data}) {
			if (data.memberReacted === ips.getSetting('memberID')) {
				return;
			}

			if (!data.content?.content_id || parseInt(data.content.content_id) !== this._getItemId()) {
				return;
			}

			if ((data?.content?.comment_id || null) !== this._getCommentId()) {
				return;
			}

			if ('count' in data && 'score' in data) {
				// If we've reacted to this content, fetch the blurb again
				if (typeof data.blurb !== "string" || this.scope.get(0).querySelector(`[data-action='reactLaunch'].ipsReact_reacted`)) {
					data.blurb = await this._fetchBlurb();
				}

				if (typeof data.blurb !== "string") {
					return;
				}

				this._updateReaction(data);
			}
		},

		/**
		 * Get the blurb for this comment/item
		 *
		 * @return {Promise<null|string>}
		 *
		 * @private
		 */
		async _fetchBlurb() {
			try {
				const reactionUrl = this.scope.get(0).querySelector(`[data-role='reaction'][href]`)?.getAttribute('href');
				if (!reactionUrl) return null;
				let url = new URL(reactionUrl);
				url.updateSearchParams({
					params: {
						csrfKey: null,
						reaction: null,
						do: `reactionBlurb${this._getCommentId() ? "Comment" : ""}`,
					}
				});
				const response = await ips.fetch(url.toString())
				if (typeof response?.blurb === 'string') {
					return response.blurb;
				}
			} catch (e) {}

			return null;
		},

		/**
		 * Get the comment id for this reaction element; It fetches from a bit of content controlled by ips.core.comment.js
		 *
		 * @returns {number|null}
		 */
		_getCommentId() {
			if ($(this.scope).get(0)?.closest(`[data-commentid]`)) {
				return parseInt($(this.scope).get(0)?.closest(`[data-commentid]`).dataset.commentid) || null
			}
			return null;
		},

		/**
		 * Get the id of the item this reaction controller's element belongs to
		 *
		 * @returns {number|null}
		 */
		_getItemId() {
			return parseInt($(this.scope).get(0)?.closest('[data-feedid]')?.dataset.feedid.match(/(\d+)$/)?.[1]) || parseInt(document.body.dataset?.pageid) || null
		},
		
		/**
		 * Click handler for the react button - only relevant on mobile
		 *
		 * @returns 	{void}
		 */
		clickLaunchReaction() {
			if( !ips.utils.events.isTouchDevice() || this._singleReaction ){
				return;
			}
			
			this._reactTypeContainer.addClass('ipsReact_types_active');
			this._launchReaction();
		},

		/**
		 * Launch event handler for mouseenter event
		 *
		 * @returns 	{void}
		 */
		launchReaction() {
			// Ignore these on mobile
			if (ips.utils.events.isTouchDevice()) {
				return;
			}

			this._launchReaction();
		},

		/**
		 * Handler for clickLaunchReaction and launchReaction to open the flyout
		 *
		 * @returns 	{void}
		 */
		_launchReaction() {
			this._reactTypes.prop('hidden', false).removeClass('ipsReact_hoverOut').addClass('ipsReact_hover');
		},

		/**
		 * Handler for hiding the reaction flyout
		 *
		 * @returns 	{void}
		 */
		unlaunchReaction() {
			this._reactTypes.animationComplete( () => {
				if( this._reactTypes.hasClass('ipsReact_hoverOut') ){
					this._reactTypes.removeClass('ipsReact_hoverOut').prop('hidden', true);
				}
			});

			this._reactTypes.removeClass('ipsReact_hover').addClass('ipsReact_hoverOut');
			this._reactTypeContainer.removeClass('ipsReact_types_active');
		},

		/**
		 * Handler for unreacting to a post
		 *
		 * @param 		{Event} 	[e] 	Event object
		 * @returns 	{void}
		 */
		async unreact(e) {
			e?.preventDefault();
			e?.stopPropagation();

			const defaultReaction = this.scope.find('[data-defaultReaction]');
			const url = this._reactTypeContainer.attr('data-unreact');

			// If the user's reaction isn't the default one, we need to swap them around
			if (!defaultReaction.closest('[data-action="reactLaunch"]').length) {
				// We need to swap the buttons
				const currentReaction = this._reactButton.find('[data-role="reaction"]');
				const defaultReactionCopy = defaultReaction.clone();
				const currentReactionCopy = currentReaction.clone();

				currentReaction.replaceWith( defaultReactionCopy.removeClass('ipsReact_active') );
				defaultReaction.replaceWith( currentReactionCopy.removeClass('ipsReact_active') );
			}

			// Remove the reacted class
			this._reactButton.removeClass('ipsReact_reacted');

			// Hide the close button
			this._reactClose.fadeOut();

			// And trigger the close event
			this.unlaunchReaction();

			// Fire the ajax request
			const response = await ips.fetch(url);
			this._updateReaction(response, ips.getString('removedReaction'));
		},

		_updateReaction(response, flashMsg) {
			// Are we only showing the score?
			if (this._reactCount.hasClass('ipsReact_reactCountOnly')) {
				this._reactCount.find('[data-role="reactCountText"]').text( response.score ).removeClass('i-background_positive i-background_negative i-background_2');

				if (parseInt(response.score) >= 1) {
					this._reactCount.addClass('i-background_positive');
				} else if (parseInt(response.score) < 0) {
					this._reactCount.addClass('i-background_negative');
				} else {
					this._reactCount.addClass('i-background_2');
				}

				// Hide the count if there's no reactions; otherwise show
				if (parseInt(response.count) === 0) {
					this._reactCount.prop('hidden', true);
				} else {
					this._reactCount.prop('hidden', false);
				}
			} else {	
				this._reactBlurb.html(response.blurb);
				this._reactCount.text(response.count);

				if (parseInt(response.count) > 0) {
					this._reactBlurb.removeClass('ipsHide').fadeIn();
				} else {
					this._reactBlurb.fadeOut();
				}
			}

			this._reactTypeContainer.removeClass('ipsReact_types_active');

			// Let the user know
			if (flashMsg) {
				ips.ui.flashMsg.show(flashMsg);
			}
		},

		/**
		 * Handler for clicking a reaction
		 *
		 * @param 		{Event} 	e 		Event object
		 * @returns 	{void}
		 */
		async clickReaction(e) {
			e?.preventDefault();

			// If this is a single reaction, and we're active, then we'll treat it as an 'unreact' action
			if (this._singleReaction && this._reactButton.hasClass('ipsReact_reacted')) {
				this.unreact(null);
				return;
			}

			// Mobile support - check whether we've activated the flyout first
			// Or, if this is a single reaction, ignore the flyout and just proceed with reacting
			if (ips.utils.events.isTouchDevice() && !this._singleReaction && !this._reactTypeContainer.hasClass('ipsReact_types_active')) {
				return;
			}

			const reaction = $(e.currentTarget);
			const url = reaction.attr('href');
			const currentButton = this.scope.find('[data-action="reactLaunch"] > [data-role="reaction"]');
			const newReaction = (!$(e.currentTarget).closest('[data-action="reactLaunch"]').length || !this._reactButton.hasClass('ipsReact_reacted'));

			// Remove all 'active' classes to reset their states
			this._removeActiveReaction();

			// Trigger a pulse animation on the selected reaction
			reaction.addClass('ipsReact_active');

			// Add 'reacted' class to button
			this._reactButton.addClass('ipsReact_reacted');

			// Use a timeout here to allow time for the 'pulse' animation to finish
			setTimeout(() => {
				if (reaction.closest('[data-action="reactLaunch"]').length === 0) {
					// Clone and swap the current/new reaction
					const currentButtonCopy = currentButton.clone(),
						reactionCopy = reaction.clone();

					currentButton.replaceWith( reactionCopy.removeClass('ipsReact_active') );
					reaction.replaceWith( currentButtonCopy.removeClass('ipsReact_active') );

					// Show the x button, hide the flyout and remove active styles
					setTimeout(() => this._reactClose.fadeIn(), 400);
					this.unlaunchReaction();
					this._removeActiveReaction();
				} else {
					// Show the x button, hide the flyout and remove active styles
					setTimeout(() => this._reactClose.fadeIn(), 400);
					this.unlaunchReaction();
					this._removeActiveReaction();
				}
			}, 400);

			// Only bother with an ajax request if we're updating the reaction
			if (newReaction) {
				let reactionTitle = reaction.innerText;
				let reactionIcon = reaction.find('img[data-ipsTooltip]');
				if (reactionIcon) {
					reactionTitle = reactionIcon.attr('data-ipstooltip') || reactionIcon.attr('title');
				}
				reactionTitle = reactionTitle || undefined;
				try {
					const response = await ips.fetch(url)
					this._updateReaction(response);

					/* Data Layer Event */
					try {
						if (IpsDataLayerConfig && IpsDataLayerConfig._events.content_react.enabled) {
							let context = IpsDataLayerContext || {};

							$('body').trigger('ipsDataLayer', {
								_key: 'content_react',
								_properties: {
									...context,
									'reaction_type': reactionTitle, ...(response.datalayer || {})
								},
							});
						}
					} catch (e) {}
				} catch (jqXHR) {
					Debug.log('Failed to send a reaction to the server');
					if ('responseJSON' in jqXHR && jqXHR.responseJSON.error === 'react_daily_exceeded') {
						ips.ui.alert.show({
							type: 'alert',
							icon: 'warn',
							message: ips.getString('reactDailyExceeded'),
							callbacks: {}
						});
					} else {
						ips.ui.alert.show({
							type: 'alert',
							icon: 'warn',
							message: ips.getString('reactError'),
							callbacks: {}
						});
					}

					// Undo all the hard work we did to make the reaction active :(
					this._reactButton.removeClass('ipsReact_reacted');
					this._reactClose.remove();
				}
			}
		},

		/**
		 * Removes the active classname from all reactions to reset the animation
		 *
		 * @returns 	{void}
		 */
		_removeActiveReaction() {
			this._reactTypeContainer.find('.ipsReact_active').removeClass('ipsReact_active');
		}
	});
}(jQuery));
