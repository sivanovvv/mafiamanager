/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.copy.js - Widget for copying content to the clipboard
 *
 * Author: Ehren Harber
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.copy', function(){

		function respond (elem) {
			elem.on( 'click', copyContent );
		}

		/**
		 * Copy content to the clipboard when the [data-ipscopy] button is clicked
		 *
		 * @param	{Event} 	e 		The click Event
		 */
		async function copyContent(e){
			let copyValue = null,
				copyButton = e.currentTarget;
			// If the copy button is referencing a target element, find it and grab its value or textContent
			if(copyButton.hasAttribute("data-ipscopy-target")){
				let copyTarget = document.getElementById(copyButton.getAttribute("data-ipscopy-target"));
				if(copyTarget){
					copyValue = copyTarget.value ? copyTarget.value : copyTarget.textContent;
				}
			} else if(copyButton.hasAttribute("data-ipscopy-text")){
				// If the button has data-ipscopy-text, use that
				copyValue = copyButton.getAttribute("data-ipscopy-text");
			} else {
				// If there still isn't a value, return early.
				console.error("Failed to copy. Missing a valid data-ipscopy-target element or data-ipscopy-text attribute");
				return;
			}
			// Copy it to the clipboard
			try {
				await navigator.clipboard.writeText(copyValue);
				if ( copyButton.hasAttribute('data-ipscopy-flashmessage')) {
					ips.ui.flashMsg.show(ips.getString('copied'))
				} else {
					copyButton.textContent = ips.getString('copied');
				}
			} catch (err) {
				console.error("Failed to copy:", err);
			}
		}
		
		ips.ui.registerWidget( 'copy', ips.ui.copy, [] );

		return {
			respond
		};
	});
}(jQuery));