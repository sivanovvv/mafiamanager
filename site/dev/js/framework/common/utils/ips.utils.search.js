/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.search - an easy api to register values that should be correlated to search terms
 *
 * Author: Matt Finger
 */


;( function($, _) {
    "use strict";

    ips.createModule('ips.utils.search', function () {
        const nonHumanReadableRegex = /[^\p{L}\p{N}\p{Emoji_Presentation}]/u
        class TrieNode {
            constructor() {
                this.size = 0
                this.children = new Map();
                this.values = new Set();
            }

            /**
             * Fix a term so it's "normal"
             * @param term
             * @return {string}
             */
            static fixTerm(term) {
                return stripAccents(
                    term
                        .toLowerCase()
                        .replaceAll(new RegExp(nonHumanReadableRegex, nonHumanReadableRegex.flags + 'g'), '')
                )
            }

            /**
             * Search for a given term
             *
             * @param {string}    term
             *
             * @return {Set<any>}
             */
            search(term) {
                term = TrieNode.fixTerm(term)
                if (term === '') {
                    const ret = new Set(this.values);
                    for (const child of this.children.values()) {
                        child.search('').forEach(item => ret.add(item))
                    }

                    return ret;
                }

                const firstChar = term.substring(0, 1), childTerm = term.substring(1)
                if (this.children.has(firstChar)) {
                    return this.children.get(firstChar).search(childTerm)
                }

                return new Set();
            }

            /**
             * Add a term with associated values. Returns the number of terms actually added
             *
             * @param {string}    term
             * @param {array} values
             *
             * @return {number}
             */
            addTerm(term, values = []) {
                term = TrieNode.fixTerm(term)
                if (term === '') {
                    const startSize = this.values.size
                    for (const value of values) {
                        this.values.add(value)
                    }
                    const delta = this.values.size - startSize;
                    this.size += delta;
                    return delta;
                }

                const firstChar = term.substring(0, 1)
                const childTerm = term.substring(1)
                if (!this.children.has(firstChar)) {
                    this.children.set(firstChar, new TrieNode())
                }

                const delta = this.children.get(firstChar).addTerm(childTerm, values)
                this.size += delta;
                return delta;
            }
        }

        /**
         * @type {Map<*, TrieNode>}
         */
        const staticCache = new Map();

        /**
         * Remove accents from a string
         * @param {string}  str
         * @return {string}
         */
        function stripAccents(str) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        return {
            /**
             * Add a term to a tree given the tree identifier
             *
             * @param {any}     tree        The tree identifier. This can be anything but try not to use HTML nodes or things that could get prevented from garbage collection (triggering a memory leak). If you don't know what that means, probably stick to just a string :)
             * @param {string}  term
             * @param {*[]}     values
             *
             * @return {number}
             */
            addTerm(tree, term, values=[]) {
                if (!staticCache.has(tree)) {
                    staticCache.set(tree, new TrieNode())
                }
                const trie = staticCache.get(tree)

                let added = 0;
                const components = term.toLowerCase().split(nonHumanReadableRegex);
                for (let i = 0; i < components.length; i++) {
                    const compoundTerm = components.slice(i).join('')
                    added += trie.addTerm(compoundTerm, values);
                }
                return added;
            },

            /**
             * Get any registered values for a given search term
             *
             * @param {any}         tree    an identifier for the tree
             * @param {string}      term    the search term
             *
             * @return {Set<*>}
             */
            search(tree, term) {
                if (staticCache.has(tree)) {
                    return staticCache.get(tree).search(term)
                }

                return new Set();
            },

            /**
             * Get the size of results in the tree of the given type
             * @param tree
             * @return {number}
             */
            getSize(tree) {
                if (staticCache.has(tree)) {
                    return staticCache.get(tree).size
                }
                return 0;
            },

            /**
             * Fix the term so that it is what the tree actually stores
             *
             * @param {string}  term
             *
             * @return {string}
             */
            fixTerm(term) {
                return TrieNode.fixTerm(term)
            },

            stripAccents
        }
    })

}(jQuery))