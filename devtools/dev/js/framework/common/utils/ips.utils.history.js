/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.history.js - A module for working with events
 *
 * Author: Matt Finger & Stuart Silvester
 */

;( function($, _){
    "use strict";

    ips.createModule('ips.utils.history', function () {
        const _state = {
            current: window.history.state?.state instanceof Object ? {"": {}, ...window.history.state.state} : {"" : {}},
            lastKey: window.history.state?.lastKey || ''
        }

        window.history.replaceState({..._state}, '', window.location.href)

        /**
         * Fires an event to the window indicating the page's history state was modified
         *
         * @param {Event} [e]
         * @param {"pop"|"push"|"replace"|'load'}	[type]		What event caused the event to originate
         *
         * @return {CustomEvent<{unused: null, state: any, title: string, url: string, originalEvent?: Event}>}
         * @constructor
         */
        function ipsHistoryChange(e, type) {
            const detail = {
                state: _state.current,
                unused: null,
                url: window.location.href,
                title: document.title,
                originalEvent: e,
                type
            }


            const event = new CustomEvent("historychange", {
                detail,
                bubbles: true
            })

            window.dispatchEvent(event)

            const key = _state.lastKey
            Debug.log(`IPS History: Firing historychange${key ? ` and historychange:${key}` : ``} event(s) with type ${type}`)
            if (key) {
                const event = new CustomEvent(`historychange:${key}`, {
                    detail,
                    bubbles: true
                })

                window.dispatchEvent(event)
            }
        }

        window.addEventListener('popstate', e => {
            setTimeout(() => {
                if (window.history.state instanceof Object) {
                    if (window.history.state.current instanceof Object) {
                        _state.current = window.history.state.current
                    } else {
                        _state.current = {..._state.current}
                    }
                    _state.lastKey = window.history.state.lastKey || ''
                }

                ipsHistoryChange(e, 'pop')
            })
        });

        ipsHistoryChange(undefined, 'load');

        return {
            /**
             *
             * @return {string}
             */
            getLastChangeType() {
                return _state.lastKey
            },

            /**
             * Get the current state
             *
             * @param {string}		key
             *
             * @return {Object}
             */
            getState(key) {
                return key ? (_state.current[key] || {}) : _state.current
            },

            /**
             * Add a new state to the browser using pushstate.
             *
             * @param {*} 		state		The state, this can be literally any JS value
             * @param {string}	key			The key of the state being applied. The state parameter will be stored using this state, and the event `historychange:${key}` will be fired on the window
             * @param {string}	url			The url that the state is being converted to
             * @param {Event}	[e]			Optional: an event that was the original cause of this being invoked; it is added to the historychagne event's details
             */
            pushState( state, key, url, e ) {
                _state.current = {..._state.current, [key] : state}
                _state.lastKey = key

                window.history.pushState({..._state}, '', url);
                ipsHistoryChange(e, 'push')
            },

            /**
             * Replace the state of the browser. This means that pressing back won't return the current state
             *
             * @param {*} 		state		The state, this can be literally any JS value
             * @param {string} 	key            The key of the state being applied. The state parameter will be stored using this state, and the event `historychange:${key}` will be fired on the window
             * @param {string}	url			The url that the state is being converted to
             * @param {Event}   [e]            Optional: an event that was the original cause of this being invoked; it is added to the historychagne event's details
             */
            replaceState(state, key, url, e) {
                _state.current = {..._state.current, [key]: state}
                _state.lastKey = key

                window.history.replaceState({..._state}, '', url)
                ipsHistoryChange(e, 'replace')
            }
        };
    });
}(jQuery));