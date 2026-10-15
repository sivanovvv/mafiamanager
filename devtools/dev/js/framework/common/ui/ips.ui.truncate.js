/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.truncate.js - Text truncating widget
 * Hides the overflow with a 'show more' link
 *
 * Author: Ehren Harber
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.truncate', function(){
		/**
		 * @type {WeakMap<Element, function>}
		 */
		const TRUNCATE_CALLBACK_MAP = new WeakMap();
		document.addEventListener('ips:truncateCollapse', e => {
			if (TRUNCATE_CALLBACK_MAP.has(e.target)) {
				TRUNCATE_CALLBACK_MAP.get(e.target)();
				TRUNCATE_CALLBACK_MAP.delete(e.target);
			}
		}, {capture: true});

		var defaults = {
			expandText: ips.getString('show_more'),
			deferred: false,
			deferredClasses: undefined,
		};

		var respond = function (elem, options) {

			let el = elem[0];

			// let the editor take care of this for itself
			if (el.closest('[data-ipseditorv5],.tiptap')) {
				return;
			}

			const collapseIfNeeded = () => {
				delete el.dataset.ipstruncateDeferred; // this causes the css to remove the overflow effect; we need to remove it before evaluating the scroll height.
				if (el.scrollHeight > el.offsetHeight) {
					if (options.deferred && options.deferredClasses) {
						for (const cls of options.deferredClasses.split(/\s+/)) {
							el.classList.add(cls);
						}
					}
					_hideTruncate(elem, { ...defaults, ...(options || {}) });
				}
			}

			if (options.deferred) {
				TRUNCATE_CALLBACK_MAP.set(el, collapseIfNeeded);
				return;
			}

			collapseIfNeeded();
		},

		/**
		 * Truncates content by hiding text
		 *
		 * @param	{elem} 		elem 		The element containing text being truncated
		 * @param	{object} 	options 	The options passed into this widget
		 * @returns {void}
		 */
		_hideTruncate = function (elem, options) {
			if( elem.attr('data-truncated') ){
				return;
			}

			// Build the template
			var showMore = ips.templates.render( 'core.truncate.expand', {
				text: options.expandText
			});

			$( elem ).after( showMore );

			var expander = elem.next("[data-action='expandTruncate']");

			elem.attr('data-truncated', true);

			// Hook up event
			expander.on('click', function (e) {
				elem.attr('data-truncate-expanded', true);
				expander.remove();
			});
		};

		ips.ui.registerWidget( 'truncate', ips.ui.truncate,
			['expandText', 'deferred']
		);

		return {
			respond: respond
		};
	});
}(jQuery));