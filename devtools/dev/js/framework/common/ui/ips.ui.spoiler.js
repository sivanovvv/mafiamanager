/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.spoiler.js - Spoiler widget for use in posts
 * Content is hidden until the user elects to view it
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";



	ips.createModule('ips.ui.spoiler', function(){

		/**
		 * Responder for spoiler widget
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{event} 	e 		 	The event object passed through
		 * @returns {void}
		 */
		function respond(elem, options, e) {

			/* Create a details element and put the legacy spoiler contents inside it */
			elem.contents().hide();
			const details = document.createElement('details');
			for (const attr of [...$(elem).get(0).getAttributeNames()]) {
				try {
					details.setAttribute(attr, $(elem).get(0).getAttribute(attr));
				} catch (e) {
					Debug.warn(e);
				}
			}
			$(elem).get(0).after(details);
			elem.hide();

			for (const child of [...$(elem).get(0).childNodes]) {
				details.appendChild(child);
			}
			elem = $(details);

			/* Do we have an existing citation block? (quotes from older versions won't, newer will) */
			var existingHeader = elem.children('.ipsSpoiler_header');

			/* Build the header block */
			var header = ips.templates.render( 'core.editor.spoilerHeader' );

			/* Add or replace it */
			if ( existingHeader.length ) {
				existingHeader.replaceWith( header );
			} else {
				elem.prepend( header );
			}

			/* Set the event handler for opening/closing */
			elem.find('> .ipsSpoiler_header').on( 'click', _toggleSpoiler );
		}
		
		/**
		 * Event handler for toggling the spoiler visibility
		 *
		 * @param 	{Event} 	e 		Event object
		 * @returns {void}
		 */
		function _toggleSpoiler(e) {
			var header = $( e.currentTarget );
			var target = $( e.target );
			var spoiler = $( e.target ).closest('[data-ipsSpoiler]');

			if( target.is('a:not( [data-action="toggleSpoiler"] )') || ( target.closest('a').length && !target.closest('a').is('[data-action="toggleSpoiler"]') ) ){
				return;
			}

			e.preventDefault();

			if( header.hasClass('ipsSpoiler_closed') ){
				spoiler.attr('open', '');
				ips.utils.anim.go( 'fadeIn', header.siblings() );
				header.removeClass('ipsSpoiler_closed').addClass('ipsSpoiler_open').find('span').text( ips.getString('spoilerClickToHide') );
				$( document ).trigger('contentChange', [ spoiler ] );
			} else {
				spoiler.attr('open', null);
				header.siblings().hide();
				header.removeClass('ipsSpoiler_open').addClass('ipsSpoiler_closed').find('span').text( ips.getString('spoilerClickToReveal') );
			}

			e.stopPropagation();
		}
		
		// Register this widget with ips.ui
		ips.ui.registerWidget( 'spoiler', ips.ui.spoiler );

		return {
			respond: respond
		}
	});
}(jQuery));