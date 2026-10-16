<?php
/**
 * Smart Embeds – Invision Community 5 application.
 */
namespace IPS\smartembeds;

use IPS\Application as SystemApplication;

if (!defined('\\IPS\\SUITE_UNIQUE_KEY')) {
    header(($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0') . ' 403 Forbidden');
    exit;
}

class Application extends SystemApplication
{
}
