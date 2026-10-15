/**
 * @module core.admin.stats.downloadButton
 * Controller to manage the download button and change the location based on the active tab
 *
 * @since March 2025
 * @author Matt Finger
 * @copyright Invision Power Services, Inc.
 */
;(function($, _) {
    "use strict";
    ips.controller.register("core.admin.stats.downloadButton", {
        initialize() {
            const update = () => {
                const url = new URL(this.scope.attr('href'), window.location.origin);
                const locationParams = new URLSearchParams(window.location.search);
                url.updateSearchParams('report_id', locationParams.get('report_id') || '0');
                url.updateSearchParams('tab', locationParams.get('tab') || 'charts');
                const rangeVal = document.querySelector(`[data-controller*="core.admin.stats.overview"] .cStatsFilters select[name="predate"]`)?.value || '7';
                if (rangeVal && parseInt(rangeVal) === -1) {
                    url.updateSearchParams({param: 'range', value: null});
                    let startInput = document.querySelector(`[data-controller*="core.admin.stats.overview"] .cStatsFilters #dateFilterInputs input[name="date[start]"]`);
                    let endInput = document.querySelector(`[data-controller*="core.admin.stats.overview"] .cStatsFilters #dateFilterInputs input[name="date[end]"]`);
                    if (startInput.valueAsNumber && endInput.valueAsNumber) {
                        url.updateSearchParams('range[start]', Math.round(startInput.valueAsNumber / 1000).toString());
                        url.updateSearchParams('range[end]', Math.round((endInput.valueAsNumber || Date.now()) / 1000).toString());
                    }
                } else {
                    console.log('updating range; removing start and end')
                    url.updateSearchParams({params: {
                            'range[start]': null,
                            'range[end]': null,
                        }});
                    url.updateSearchParams("range", rangeVal);
                }
                this.scope.attr('href', url.toString());

                // hacky, but we can also update the existing report selector links
                const menuSelectorLink = this.scope.get(0).closest('[data-controller*="core.admin.core.pageActions"]')?.querySelector('[data-role="reportSelector"]');
                const menuSelector = menuSelectorLink?.getAttribute('id') && document.querySelector(`.ipsMenu#${menuSelectorLink?.getAttribute("id")}_menu`);
                menuSelector?.querySelectorAll('.ipsMenu_item a').forEach(link => {
                    const linkUrl = new URL(link.getAttribute('href'), window.location.href);
                    linkUrl.updateSearchParams({param: 'tab', value: url.searchParams.get('tab') || null});
                    link.setAttribute('href', linkUrl.toString());
                });
            };
            window.addEventListener("historychange", update);
            document.addEventListener('input', e => {
                if (e.target.matches( '[data-controller*="core.admin.stats.overview"] .cStatsFilters :not([data-role="dateFilterInputs"] *)' )) {
                    if (e.target.matches(`select[name="predate"]`) && parseInt(e.target.value) === -1) {
                        Debug.log(`Not updating because the date isn't updated`);
                        return;
                    }
                    setTimeout(() => {
                        update();
                    })
                }
            }, {capture: true});

            // The custom date range is only applied after the user clicks update
            document.addEventListener('submit', e => {
                if (e.target instanceof HTMLFormElement && e.target.matches(`[data-role="dateFilter"]`)) {
                    setTimeout(() => update());
                }
            }, {capture: true});

            update();
        }
    });
}(jQuery));