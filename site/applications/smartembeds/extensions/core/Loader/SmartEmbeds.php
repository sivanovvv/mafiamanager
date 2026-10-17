<?php
namespace IPS\smartembeds\extensions\core\Loader;

use IPS\Extensions\LoaderAbstract;

class SmartEmbeds extends LoaderAbstract
{
    public function css(): array
    {
        return [];
    }

    public function js(): array
    {
        return [[
            '/applications/smartembeds/interface/smartembeds-v064-editor.js',
            '/applications/smartembeds/interface/smartembeds-v064-display.js'
        ]];
    }
}
