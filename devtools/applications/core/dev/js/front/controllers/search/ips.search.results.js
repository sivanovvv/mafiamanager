/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.search.results.js - Search results controller
 *
 * Author: Rikki Tissier & Ehren Harber
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.search.results', {

		_resultLength: 300,
		_terms: [],
		_minTermLength: 3,

		initialize: function () {
			this.setup();
			this.on( document, 'contentChange', this.contentChange);
		},

		/**
		 * Setup methods. Adds case-insensitive jQuery expression.
		 *
		 * @returns 	{void}
		 */
		setup() {
			const self = this;

			try {
				this._terms = JSON.parse( this.scope.attr('data-term') );
				if (!Array.isArray(this._terms)) {
					throw new TypeError(`The 'data-term' attribute is expected to be a JSON-encoded array of strings.`);
				}

				this._terms = this._terms
					.map(term => term.trim())
					.filter(term => term.length >= this._minTermLength);

				// If the search terms are an empty array (such as tag pages), then return early since we have nothing to highlight
				if (!this._terms.length) {
					return;
				}

			} catch(err) {
				Debug.log("Error parsing search terms");
				return;
			}

			this._regex = this.compileRegex(this._terms);

			// Highlight terms using the CSS Highlights API
			if(window.CSS && CSS.highlights){

				if (!(window.RegExp.escape instanceof Function)) {
					window.RegExp.escape = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				}

				// Lowercase terms are used for highlighting
				this._lowercaseTerms = this._terms.map(t => t.toLowerCase());

				// Get existing highlight set or create new one
				this.highlight = CSS.highlights.get('search-results');

				if (!this.highlight) {
					this.highlight = new Highlight();
					CSS.highlights.set('search-results', this.highlight);
				}

				// Clear any existing ranges before adding new ones
				this.highlight.clear();

			}

			// Process each result
			this.scope.find('[data-role="activityItem"]').each( function () {
				self._processResult( $( this ) );
			});

		},

		/**
		 * Event handler for document content change
		 *
		 * @returns 	{void}
		 */
		contentChange: function () {
			var self = this;

			this.scope.find('[data-role="activityItem"]').each( function () {
				self._processResult( $( this ) );
			});
		},

		/**
		 * Processes the given element as a search result
		 *
		 * @param 		{element} 	result 		The search result element
		 * @returns 	{void}
		 */
		_processResult: function (result) {
			// Don't process it twice
			if( result.attr('data-processed') ){
				return;
			}

			// Start by locating the first hit
			var findWords = result.find('[data-findTerm]');

			if( findWords.length ){
				this._findWords( findWords );
			}

			// Now highlight the terms
			if(window.CSS && CSS.highlights){
				result[0].querySelectorAll('[data-searchable]').forEach(el => {
					this._highlight( el );
				});
			}

			result.attr('data-processed', true);
		},


		/**
		 * Takes a search result, and finds the match within it and then reduces the text
		 * to just the characters surrounding the match
		 *
		 * @param 		{element} 	result 		The element containing the text to work on
		 * @returns 	{void}
		 */
		_findWords: function (result) {
			var text = result.text().trim();
			var firstMatch = text.length;
			var startPoint = 0;
			var foundMatches = false;

			//-----------
			// Step 1: Find the first occurrence of each term
			for( var i = 0; i < this._terms.length; i++){

				// Note: regexp used here because simple indexOf isn't case insensitive
				// and toLowercase doesn't work well with some languages
				var indexOf = text.search( new RegExp( ips.utils.escapeRegexp( this._terms[i] ), 'i' ) );

				if( indexOf !== -1 ){
					foundMatches = true;

					if( indexOf < firstMatch ){
						firstMatch = indexOf;
					}
				}
			}

			//-----------
			// Step 2: Search backwards to find the closest puncutation mark, which is where we'll start our result snippet
			// We'll go back up to half of our result length, but stop if we hit the beginning
			var punctuationMarks = ['.', ',', '?', '!'];
			var searchBack = ( firstMatch - ( this._resultLength / 2 ) < 0 ) ? 0 : firstMatch - ( this._resultLength / 2 ); 

			// if there were no matches, then we'll just set manual values
			if( !foundMatches ){
				startPoint = 0;
			} else {
				for( var j = firstMatch; j > searchBack; j-- ){
					if( punctuationMarks.indexOf( text[j] ) !== -1 ){
						startPoint = j + 1;
						break;
					}
				}
			}

			//-----------
			// Step 3: Count forward from the starting point to get our snippet
			var finalSnippet = text.substring( startPoint, startPoint + 300 ).trim();

			if( startPoint > 0 && foundMatches ){
				finalSnippet = '...' + finalSnippet;
			}

			if( startPoint + this._resultLength < text.length || ( !foundMatches && text.length > this._resultLength ) ){
				finalSnippet = finalSnippet + '...';
			}

			result.text( finalSnippet );
		},

		/**
		 * @param {string[]} terms
		 * @return RegExp
		 */
		compileRegex: function(terms){
			return new RegExp(`\\b(${terms.map(t => RegExp.escape(t.trim())).join('|')})\\w*`, 'ig');
		},

		/**
		 * @param terms
		 * @param {Node}	node
		 * @return {Range[]}
		 */
		findRangesInNode: function(root){

			const ranges = [];
			const regex = this._regex;

			const walker = document.createTreeWalker(
				root,
				NodeFilter.SHOW_TEXT
			);

			let node;

			while ((node = walker.nextNode())) {

				const parent = node.parentElement;

				if (parent && parent.offsetParent === null) {
					continue;
				}

				regex.lastIndex = 0;

				let match;
				while ((match = regex.exec(node.nodeValue)) !== null) {

					const range = new Range();
					range.setStart(node, match.index);
					range.setEnd(node, match.index + match[0].length);

					ranges.push(range);
				}
			}

			return ranges;
		},

		/**
		 * Highlight search results
		 *
		 * @param 		{HTMLElement} 	root 	The element which contains the search terms
		 * @returns 	{void}
		 */
		_highlight(root) {
			this.findRangesInNode(root).forEach(range => {
				this.highlight.add(range);
			});
		}

	});
}(jQuery));