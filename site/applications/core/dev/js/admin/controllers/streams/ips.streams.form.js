/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.streams.form.js
 *
 * Author: Esther Eisner
 */

;(function ($) {

    "use strict";

    ips.controller.register('core.admin.streams.form',
        {
            initialize: function () {
                this.checkReadStatus()
                this.elem.addEventListener('change', () => this.checkReadStatus())
            },

            /**
             * Disable the ability to include comments if we set the stream type to unread.
             * Unread logic is only at the item level, so including comments will never work.
             * @return void
             */
            checkReadStatus(){
                if(this.elem.querySelector('input[name="stream_read"][value="unread"]').checked){
                    this.elem.querySelector('input[name="stream_include_comments"][value="0"]')?.setAttribute('checked','')
                    this.elem.querySelector('input[name="stream_include_comments"][value="1"]')?.setAttribute('disabled','')
                } else {
                    this.elem.querySelector('input[name="stream_include_comments"][value="1"]')?.removeAttribute('disabled')
                }
            }
        });
}(jQuery));