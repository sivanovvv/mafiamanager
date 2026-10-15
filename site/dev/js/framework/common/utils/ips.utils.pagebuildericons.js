;((($, _) => {
    "use strict";

    ips.createModule('ips.utils.pagebuildericons', function() {
        const loadPagebuilder = async () => {
            if ( !ips.utils.pagebuilder ) {
                const url = ips.getSetting('baseURL') + `/applications/core/interface/static/pagebuilder/manifest.json?v=${ips.getSetting('pagebuilderKey')}&antiCache=${encodeURIComponent(ips.getSetting('jsAntiCache'))}`;
                const data = await ips.fetch(url)

                const toLoad = [];

                for(const key in data) {
                    if (data[key].file?.match(/\.css$/i)) {
                        const href = ips.getSetting('baseURL') + '/applications/core/interface/static/pagebuilder/' + data[key].file + `?antiCache=${encodeURIComponent(ips.getSetting('jsAntiCache'))}`;
                        if (!document.querySelector(`[href="${encodeURI(href)}"]`)) {
                            const style = document.createElement('link')
                            style.rel = 'stylesheet'
                            style.href = href
                            document.head.appendChild(style)
                        }

                    } else if (data[key].isEntry) {
                        toLoad.push(ips.getSetting('baseURL') + '/applications/core/interface/static/pagebuilder/' + data[key].file)
                    }

                }

                if (toLoad.length) {
                    await ips.loader.getStatic(toLoad)
                }
            }
        }

        const fillIcons = () => {
            document.querySelectorAll('[for*="elCheckbox_dev_widget_layouts_"]').forEach(async label => {
                if (!label.querySelector('svg.pagebuildericon')) {
                    await loadPagebuilder()
                    const icon = label.getAttribute('for').match(/^elCheckbox_dev_widget_layouts_([a-z\-_]+)$/i)[1]
                    ips.utils.pagebuilder.fillSemanticIcon(label, icon).then(() => {
                        label.querySelector('svg.pagebuildericon').dataset.ipstooltip = ''
                        label.querySelector('svg.pagebuildericon').setAttribute('title', ips.getString(`core_pagebuilder_wrap__${icon}`))
                    })
                }
            })
        }

        $(document).on('contentChange', fillIcons)
        fillIcons()

        return {}
    })
})(jQuery))