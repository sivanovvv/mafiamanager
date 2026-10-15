/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.members.lazyLoadingProfileBlock.js
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.members.lazyLoadingProfileBlock', {
		
		/**
		 * Init
		 */
		initialize: function () {
			var scope = $(this.scope);
			ips.getAjax()( scope.attr('data-url') ).done(function(response){
				const doc = (new DOMParser()).parseFromString(response, 'text/html');
				scope.html(doc.body.innerHTML);
				// include scripts
				let headInserts = "";
				doc.head.querySelectorAll('script').forEach(script => {
					if (!script.hasAttribute('src') || !document.querySelector(`script[src="${script.getAttribute('src')}"]`)) {
						headInserts += script.outerHTML + '\n';
					}
				});


				doc.head.querySelectorAll('link[href]').forEach(link => {
					if (!document.querySelector(`link[href="${link.getAttribute('href')}"]`)) {
						headInserts += link.outerHTML + '\n';
					}
				});

				if (headInserts) {
					document.head.insertAdjacentHTML('beforeend', headInserts);
				}

				$( document ).trigger( 'contentChange', [ scope ] );
			});
		},
				
	});
}(jQuery));