/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.alertMessage.js - Handle an alert message created in the ModeratorCP
 *
 * Author: Matt Finger
 */
;(function($,_) {
    "use strict";

    ips.createModule('ips.ui.alertMessage', () => {
        class AlertMessage extends ips.ui.BaseWidget {
            constructor(...args) {
                super(...args);
                this.form?.addEventListener('submit', this.remoteSubmit.bind(this), {capture: true});
                this.element.addEventListener('click', this.remoteSubmit.bind(this), {capture: true});
                this.element.addEventListener('ips:editorUpdated', () => {
                    this.element.querySelector('[data-role="reply"]').removeAttribute('disabled')
                }, {once: true})
            }

            /**
             * The form element
             * @return {HTMLFormElement|undefined}
             */
            get form() {
                return this.element?.querySelector('form') || (this.element instanceof HTMLFormElement ? this.element : undefined);
            }

            /**
             * @return {string|undefined}
             */
            get url() {
                return this.element?.querySelector('[data-role="reply"]')?.getAttribute('href') || this.form?.getAttribute('action');
            }

            /**
             * Handle the remote submission of this element
             *
             * @param {SubmitEvent|MouseEvent|Event} e
             */
            async remoteSubmit(e) {
                if (e.type === 'submit' || e.target.closest('input[type="submit"],form button:not([type="button"]), a:is([data-role="dismiss"], [data-role="reply"])')) {
                    e.preventDefault();

                    if (e.target.closest('[disabled]')) {
                        return;
                    }

                    if (e.type === 'submit' || e.target.closest('[data-role="reply"]')) {
                        const url = this.url;
                        const form = this.form;
                        if (url && form) {
                            const data = Object.fromEntries((new FormData(form)).entries());
                            try {
                                const response = await ips.fetch(url, {
                                    method: form.method || 'post',
                                    data,
                                    bypassRedirect: true,
                                });

                                if (typeof response?.redirect === 'string') {
                                    setTimeout(() => {
                                        ips.ui.alert.show({
                                            message: ips.getString('moderator_alert_reply_ready'),
                                            type: 'confirm',
                                            buttons: {
                                                ok: ips.getString('moderator_alert_reply_view'),
                                                cancel: ips.getString('ok')
                                            },
                                            callbacks: {
                                                ok() {
                                                    window.location = response.redirect;
                                                }
                                            }
                                        });
                                    });
                                }
                            } catch (e) {
                                Debug.warn(e);
                            }
                        }
                    } else {
                        // in this case, we're closing the form
                        const url = e.target.closest('a[data-role="dismiss"]')?.getAttribute('href');
                        try {
                            if (url) {
                                await ips.fetch(url, {
                                    method: 'get',
                                    bypassRedirect: true,
                                });
                            } else {
                                throw new Error(`Failed to get the dismiss ajax url of a notification`);
                            }
                        } catch (e) {
                            e.message = `Failed to set the status as dismissed.\n${e.message}`;
                            Debug.warn(e)
                        }
                    }

                    this.destruct();
                    this.element.remove();
                }
            }
        }

        return AlertMessage.buildModuleAndRegisterWidget('alertMessage');
    })
}(jQuery));