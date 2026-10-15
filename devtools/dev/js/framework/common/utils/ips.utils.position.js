/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.position.js - Positioning utilities
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.position', function () {
		/**
		 *
		 * @type {Map<Element, {rect: DOMRect, style: CSSStyleDeclaration}>}
		 */
		const CACHED_DATA = new Map();
		let caching = false;

		/**
		 * Start recording positions in a cache. REMEMBER TO END CACHING WHEN DONE
		 *
		 * @returns {true}
		 */
		function startCaching() {
			caching = true;
			return true;
		}

		/**
		 * Stop caching or clear the cache for a specific element
		 *
		 * @param {Element|undefined}	[elem=undefined]
		 *
		 * @returns {true}
		 */
		function endCaching(elem) {
			elem = elem ? $(elem).get(0) : elem;
			if (elem) {
				CACHED_DATA.delete(elem);
			} else {
				CACHED_DATA.clear();
				caching = false;
			}

			return true;
		}

		/**
		 * Get the offset parent of an element, or see if the element can be an offset parent
		 *
		 * @param {HTMLElement|jQuery}	elem
		 * @param {boolean}			[includeElem=false]
		 * @param {object}			[eventualStyle={}]		* Only used if includeElem === true. In that case, a temp child is created and its offset parent is evaluated. You can specify details like the position and location of the child so it behaves as you might expect
		 *
		 * @return {HTMLElement}
		 */
		function getOffsetParent(elem, includeElem=false, eventualStyle={}) {
			elem = $(elem).get(0);
			if (!includeElem) {
				return elem.offsetParent || document.body;
			}

			// If includeElem is true, then the offsetParent could be the element itself; moreover, we're testing if this element is an offsetParent (or a container box root).
			// We need to test a child
			let child = document.createElement('span');
			Object.assign(child.style, eventualStyle);
			child.style.opacity = '0';
			elem.appendChild(child);
			setTimeout(() => child.remove()); // after all this is done, remove the child

			return child.offsetParent || document.body;
		}

		/**
		 * Get various metrics on the element's position
		 * @param {Element} elem
		 * @return {object|false}
		 */
		function getElemPosition(elem) {
			if (!elem) {
				return false;
			}
			elem = $(elem).get(0);
			const toReturn = {};
			const {rect, style} = getElemRectAndStyle(elem);
			const {rect:docRect} = getElemRectAndStyle(document.body);

			toReturn.absPos = {
				left: rect.left - docRect.left,
				top: rect.top - docRect.top,
				right: rect.right - docRect.left,
				bottom: rect.bottom - docRect.top,
			};

			const offsetParent = getOffsetParent(elem) || document.body;
			const marginBlockStart = getPxFromDim(style.marginTop);
			const marginInlineStart = getPxFromDim(style.marginLeft);
			const {rect: offsetParentRect, style: offsetParentStyle} = getElemRectAndStyle(offsetParent);
			const offsetParentBorderLeft = getPxFromDim(offsetParentStyle.borderLeftWidth);
			const offsetParentBorderTop = getPxFromDim(offsetParentStyle.borderTopWidth);

			const offsetLeft = offsetParentRect.left + offsetParentBorderLeft;
			const offsetTop = offsetParentRect.top + offsetParentBorderTop;

			toReturn.offsetPos = {
				left: rect.left + marginInlineStart - offsetLeft,
				top: rect.top + marginBlockStart - offsetTop,
				right: rect.right + marginInlineStart - offsetLeft,
				bottom: rect.bottom + marginBlockStart - offsetTop,
			};

			toReturn.viewportOffset = {
				left: rect.left,
				top: rect.top,
			};

			toReturn.offsetParent = $(offsetParent);
			toReturn.fixed = hasFixedParents( $(elem), true );

			return toReturn;
		}

		function getPxFromDim(dim) {
			const match = dim?.trim?.().match?.(/^-?(\d+|\d+\.\d*|\.\d+)px$/);
			if (match) {
				return parseFloat(match[1])
			}
			return 0;
		}

		/**
		 * Figures out the coords to position a popup element appropriately
		 * Abandon hope all ye who enter here
		 *
		 * @param	{object} 	options	 	Options for positioning
		 * @param 	{element}	options.trigger 	The trigger element for this popup
		 * @param	{element}	options.target 		The target element, i.e. the popup itself
		 * @param	{element}	options.targetContainer 	Container element of target, if not body
		 * @param	{boolean}	options.center 		Should the target be centered?
		 * @returns {object}
		 */
		function positionElem(options) {
			const trigger = $(options.trigger);
			const triggerPos = getElemPosition(trigger);
			const triggerDims = getElemDims(trigger);
			const targetDims = getElemDims(options.target);
			const toReturn = {};
			const stemOffset = options.stemOffset || {top: 0, left: 0};
			let offsetParent;
			let positioned = false;

			options.targetContainer = options.targetContainer ? getOffsetParent(options.targetContainer, true) : $(getOffsetParent(options.target));

			if( options.targetContainer && $(options.targetContainer).length ){
				// If we have any fixed parents, we switch to using the viewport offsets, since that's how
				// fixed elements are measured. For normal absolute/relative positioned parents, use the
				// values from position() instead.
				if( hasFixedParents( trigger ) ){
					offsetParent = triggerPos.viewportOffset;
				} else {
					const containerPos = getElemPosition(options.targetContainer);

					// Here we work out the difference between the left positions of the trigger and the container to find out
					// how much we need to adjust the position of the target. We add in the offset to account for positioning, as above.
					offsetParent = {
						left: ( triggerPos.absPos.left - containerPos.absPos.left ),
						top: ( triggerPos.absPos.top - containerPos.absPos.top )
					};
				}

				positioned = true;
			} else {
				// Use the body
				offsetParent = triggerPos.viewportOffset;
			}

			// Work out the best fit for the target, trying to keep it from going off-screen
			const bestFit = _getBestFit(
				triggerPos.viewportOffset,
				triggerDims,
				targetDims,
				stemOffset,
				{
					horizontal: (options.center) ? 'center' : 'left',
					vertical: (options.above === true || options.above === 'force') ? 'top' : 'bottom'
				},
				(options.above === 'force') ? false : !options.above,
				!(options.above === 'force')
			);

			// Start to build the return object
			switch( bestFit.horizontal ){
				case 'center':
					toReturn.left = offsetParent.left + ( triggerDims.outerWidth / 2 ) - 
							( targetDims.outerWidth / 2 );
				break;
				case 'left':
					toReturn.left = offsetParent.left - stemOffset.left + ( triggerDims.outerWidth / 2 );
				break;
				case 'right':
					toReturn.left = offsetParent.left - targetDims.outerWidth +
							 ( triggerDims.outerWidth / 2 ) + stemOffset.left;
				break;
			}

			switch( bestFit.vertical ){
				case 'top':
					toReturn.top = offsetParent.top - targetDims.outerHeight + 
										stemOffset.top;
				break;
				case 'bottom':
					toReturn.top = offsetParent.top + triggerDims.outerHeight -
										stemOffset.top;
				break;
			}

			if( !positioned && !triggerPos.fixed ) {
				toReturn.top += window.scrollY;
			}

			toReturn.fixed = triggerPos.fixed;
			toReturn.location = bestFit;

			return toReturn;
		}

		/**
		 * Returns true if the provided element has any fixed-position ancestors (including tables)
		 *
		 * @param	{Element} 	elem	 	Element to test
		 * @param 	{boolean}	andSelf		Whether to include the element provided
		 * @returns {boolean}
		 */
		function hasFixedParents(elem, andSelf) {
			elem = $( elem ).get(0);
			if (!andSelf) {
				elem = elem.parentElement;
			}

			while (elem instanceof Element) {
				if (elem.style.position === 'fixed') {
					return true;
				}
				elem = elem.parentElement;
			}

			return false;
		}

		/**
		 * Get the style and rect for an element
		 * @param elem
		 * @return {{rect: DOMRect, style: CSSStyleDeclaration}}
		 */
		function getElemRectAndStyle(elem) {
			elem = $(elem).get(0);
			if (!(elem instanceof Element)) {
				const tempel = document.createElement('div');
				return {
					style: getComputedStyle(tempel),
					rect: tempel.getBoundingClientRect(),
				}
			}

			const cached = caching && CACHED_DATA.get(elem);
			if (cached) {
				return cached;
			}

			let style = getComputedStyle(elem);
			// Display contents causes an element to not have its own client box and therefore getBoundingClientRect() fails.
			let rect;
			if (style.display === 'contents') {
				// this is brutal but necessary for display: contents
				function checkChildren(el) {
					for (const child of el.children) {
						const childStyle = getComputedStyle(child);
						if (childStyle.position !== 'static') {
							continue;
						}
						if (childStyle.display === 'contents') {
							checkChildren(child);
						} else {
							const childRect = getElemRectAndStyle(child).rect;
							rect = rect || childRect;
							if (rect !== childRect) {
								rect = new DOMRect(
									Math.min(rect.left, childRect.left),
									Math.min(rect.y, childRect.y),
									Math.max(rect.width, childRect.width),
									Math.max(rect.height, childRect.height)
								);
							}
						}
					}
				}

				checkChildren(elem);

				if (!rect) {
					rect = elem.getBoundingClientRect();
				}
			} else {
				rect = elem.getBoundingClientRect();
			}

			const revertValues = {};
			if (!rect.width && !rect.height && !rect.top && !rect.bottom) {
				Debug.warn("Attempting to get the rect and style of an element that is not visible. Will attempt to show the element briefly");

				// if it isn't visible, make it visible
				const toSet = {
					position: 'absolute',
					visibility: 'hidden',
					display: 'block'
				};

				for (const k in toSet) {
					revertValues[k] = elem.style[k];
					elem.style[k] = toSet[k];
				}

				let time = Date.now();
				while (Date.now() - time < 5) {
					continue;
				}

				rect = elem.getBoundingClientRect();
				style = getComputedStyle(elem);

				for (const k in revertValues) {
					elem.style[k] = revertValues[k] || "";
				}
				time = Date.now();
				while (Date.now() - time < 5) {
					continue;
				}
			}

			const ret = {rect, style};
			if (caching) {
				CACHED_DATA.set(elem, ret);
			}
			return ret;
		}

		/**
		 * Works out the best location for an element such that it tries to avoid going off-screen
		 *
		 * @param	{object} 	viewportOffset	 	viewport offset values for the element
		 * @param	{object}	triggerDims			Dimensions of the trigger element
		 * @param 	{object}	targetDims			Dimentions of the target element (menu, tooltip etc.)
		 * @param 	{object} 	offset 				Any offset to apply to numbers (e.g. to allow for stem)
		 * @param 	{object} 	posDefaults 		set default vertical/horizontal position
		 * @param 	{boolean}	preferBottom		Should target prefer opening under the trigger?
		 * @param 	{boolean} 	attemptToFit		If true, will change vertical position based on available space (and depending on preferBottom)
		 * @returns {{vertical: "top"|"center"|"bottom", horizontal: "center"|"left"|"right"}}
		 */
		function _getBestFit(viewportOffset, triggerDims, targetDims, offset, posDefaults, preferBottom, attemptToFit) {
			const position = {
				vertical: 'bottom',
				horizontal: 'left',
				...(posDefaults || {})
			};
			
			// Left pos
			if( position.horizontal === 'center' ){
				const targetLeft = viewportOffset.left + (triggerDims.outerWidth / 2) - (targetDims.outerWidth / 2);
				const targetRight = targetLeft + targetDims.outerWidth;

				if( targetLeft < 0 || targetRight > window.innerWidth ){
					position.horizontal = 'left';
				}
			}

			if( position.horizontal === 'left' ){
				if( ( viewportOffset.left + (triggerDims.outerWidth / 2) + targetDims.outerWidth - offset.left ) > window.innerWidth ){
					position.horizontal = 'right';
				}
			} 
			
			if ( position.horizontal === 'right' ) {
				if( ( viewportOffset.right - (triggerDims.outerWidth / 2) - targetDims.outerWidth + offset.left ) < 0 ){
					position.horizontal = 'left';
				}
			}

			// Top pos
			if( attemptToFit ){
				if( position.vertical === 'top' || preferBottom ){
					if( ( viewportOffset.top - targetDims.outerHeight - offset.top ) < 0 ){
						position.vertical = 'bottom';
					}
				} else {
					if( ( viewportOffset.top + triggerDims.outerHeight + targetDims.outerHeight + offset.top ) > window.innerHeight ){
						position.vertical = 'top';
					}
				}
			}
			
			return position;
		}

		/**
		 * Returns dimensions for the given element
		 *
		 * @param	{Element} 	elem	 	Element to test
		 * @returns {object}
		 */
		function getElemDims(elem) {
			elem = $( elem ).get(0);
			if (!(elem instanceof Element)) {
				return {
					width: 0,
					height: 0,
					outerWidth: 0,
					outerHeight: 0
				}
			}

			const {rect, style} = getElemRectAndStyle(elem);
			const paddingLeft = getPxFromDim(style.paddingLeft);
			const paddingRight = getPxFromDim(style.paddingRight);
			const paddingTop = getPxFromDim(style.paddingTop);
			const paddingBottom = getPxFromDim(style.paddingBottom);
			const borderTopWidth = getPxFromDim(style.borderTopWidth);
			const borderBottomWidth = getPxFromDim(style.borderBottomWidth);
			const borderLeftWidth = getPxFromDim(style.borderLeftWidth);
			const borderRightWidth = getPxFromDim(style.borderRightWidth);

			return {
				width: rect.width - paddingLeft - paddingRight - borderLeftWidth - borderRightWidth,
				height: rect.height - paddingTop - paddingBottom - borderBottomWidth - borderTopWidth,
				outerWidth: rect.width,
				outerHeight: rect.height
			};
		}

		/**
		 * Returns the natural width for an image element
		 *
		 * @param	{element} 	elem	 	Image element to use
		 * @returns {number}
		 */
		function naturalWidth(elem) {
			return _getNatural( elem, 'Width' );
		}

		/**
		 * Returns the natural height for an image element
		 *
		 * @param	{element} 	elem	 	Image element to use
		 * @returns {number}
		 */
		function naturalHeight(elem) {
			return _getNatural( elem, 'Height' );
		}

		/**
		 * Attempts to get the line-height of the provided element. Note; there's cases where this won't be reliable.
		 * For example, if CSS styles <span> differently, it may give a value different to the parent. Test your case
		 * before relying on this.
		 *
		 * @param	{Element} 	parent	 	Element to fetch the line-height for
		 * @returns {number}
		 */
		function lineHeight(parent) {
			parent = $(parent).get(0);
			const text = document.createTextNode('A');
			parent.append(text);
			const height = text.getBoundingClientRect().height;
			parent.removeChild(text);
			text.remove();
			return height;
		}

		/**
		 * Returns the given natural dimension of an image, using the built in naturalWidth/Height property if available
		 *
		 * @param	{element} 	elem	 	Element to test
		 * @param 	{string} 	type 		Width or Height; dimension to return
		 * @returns {number}
		 */
		function _getNatural(elem, type) {
			const ret = elem[0][ 'natural' + type ];
			if (typeof ret === 'number') {
				return ret;
			}

			return 0;
		}

		return {
			getElemPosition,
			getElemDims,
			positionElem,
			hasFixedParents,
			naturalWidth,
			naturalHeight,
			lineHeight,
			getElemRectAndStyle,
			startCaching,
			endCaching,
		};
	});
}(jQuery));
