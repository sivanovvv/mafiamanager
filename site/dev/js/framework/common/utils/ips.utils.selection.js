/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.selection.js - A module for working with text selection
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.selection', function () {

		/**
		 * Returns the text selected, ensuring it's fully within the provided ancestor
		 *
		 * @param 	{element} 	ancestor 	Ancestor element
		 * @returns {void}
		 */
		var getSelectedText = function (querySelector, container) {
			var text = '';
			var container = container.get(0);
			var selection = getSelection();

			if( selection.isCollapsed ){
				return '';
			}

			if( selection.rangeCount > 0 ){
				var range = selection.getRangeAt(0);
				var clonedSelection = range.cloneContents().querySelector( querySelector );

				// This loop checks that the selection is within the ancestor, so that we don't
				// show Quote This accidentally when another comment is selected.
				for (var i = 0; i < selection.rangeCount; ++i) {
					if( !_isChild( selection.getRangeAt(i).commonAncestorContainer, container ) ){
						return '';
					}
				}

				if( clonedSelection ){
					clonedSelection.querySelectorAll(`.ipsCode[data-ips-text-highlighted="yes"]`).forEach(element => {
						const text = element.innerText;
						element.innerHTML = ''
						element.innerText = text;
					})
					text = clonedSelection.innerHTML;
				} else {
					clonedSelection = range.cloneContents();
					var startNode = selection.getRangeAt(0).startContainer.parentNode;

					if( _isChild( startNode, container ) ) {
						var div = document.createElement('div');
						div.appendChild( clonedSelection );

						clonedSelection.querySelectorAll(`.ipsCode[data-ips-text-highlighted="yes"]`).forEach(element => {
							const text = element.innerText;
							element.innerHTML = ''
							element.innerText = text;
						})
						text = div.innerHTML;
					}
				}
					
				return text;
			} else if ( document.selection ){
				return document.selection.createRange().htmlText;
			}

			return '';
		};

		var getCommonAncestor = function () {
			var selection = getSelection();

			if( selection.isCollapsed ){
				return false;
			}

			var range = selection.getRangeAt(0);
			return $( range.commonAncestorContainer );
		};

		/**
		 * Get the Range of the selected text
		 *
		 * @param 	{element} 	container 	The container element
		 * @returns {object} Containing `type` (outside or inside) determining whether selection extends beyond our container, and `range`, the Range itself
		 */
		var getRange = function (container) {
			var selection = getSelection();

			if( selection.isCollapsed ){
				return false;
			}

			var range = selection.getRangeAt(0);
			var ancestor = $( range.commonAncestorContainer );

			// Figure out if the selection goes beyond our ancestor
			if( ancestor != container && !$( range.commonAncestorContainer ).closest( container ).length ){
				return {
					type: 'outside',
					range: range
				};
			}

			return {
				type: 'inside',
				range: range
			};
		};

		/**
		 * Returns the correct selection
		 *
		 * @returns {object}
		 */
		var getSelection = function () {
			return ( window.getSelection ) ? window.getSelection() : document.getSelection();
		};

		/**
		 * Returns boolean indicating whether child belongs to parent
		 *
		 * @param 	{element} 	child 	Child element
		 * @param 	{element} 	parent 	Parent element
		 * @returns {void}
		 */
		var _isChild = function (child, parent) {
			if(child === parent){
				return true;	
			} 
			
			var current = child;
			
			while (current) {
				if(current === parent){
					return true;	
				} 
				current = current.parentNode;
			}
			
			return false;
		};
		
		return {
			getSelectedText: getSelectedText,
			getSelection: getSelection,
			getRange: getRange,
			getCommonAncestor: getCommonAncestor
		};
	});
}(jQuery));