<?php
/**
 * Public, strictly allowlisted oEmbed resolver.
 * All network requests are sent ONLY to fixed Meta or Bluesky oEmbed API hostnames.
 */
namespace IPS\smartembeds\modules\front\embed;

use IPS\Data\Cache;
use IPS\DateTime;
use IPS\Dispatcher\Controller;
use IPS\Http\Url;
use IPS\Output;
use IPS\Request;

if (!defined('\\IPS\\SUITE_UNIQUE_KEY')) {
    header(($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0') . ' 403 Forbidden');
    exit;
}

class resolve extends Controller
{
    public bool $isContentPage = false;

    protected function manage(): void
    {
        $url = trim((string) (Request::i()->url ?? ''));
        $endpoint = self::endpointFor($url);

        if ($endpoint === null) {
            Output::i()->json(['ok' => false, 'error' => 'Unsupported URL'], 400);
            return;
        }

        $cacheKey = 'smartembeds_' . hash('sha256', $url);
        try {
            $cache = Cache::i()->getWithExpire($cacheKey);
            if (is_array($cache) && isset($cache['ok'])) {
                Output::i()->json($cache, $cache['ok'] ? 200 : 502);
                return;
            }
        } catch (\OutOfRangeException $ignored) {
            // Cache miss; perform one verified Meta request.
        } catch (\Throwable $ignored) {
            // A cache outage must not interrupt forum browsing.
        }

        $result = ['ok' => false, 'error' => 'Embed unavailable'];
        $status = 502;
        try {
            // Important: endpointFor() constructs the complete provider endpoint.
            // No user-controlled hostname can reach the HTTP client.
            $response = Url::external($endpoint)->request(8)->get();
            $data = json_decode((string) $response, true);
            if (is_array($data) && !empty($data['html']) && is_string($data['html'])
                && strlen($data['html']) <= 100000) {
                // Client performs element/attribute allowlist sanitization.
                $result = ['ok' => true, 'html' => $data['html'], 'provider' => self::providerFor($url)];
                $status = 200;
            }
        } catch (\Throwable $ignored) {
            // Preserve the user's normal URL if Meta blocks/unpublishes the post.
        }

        try {
            Cache::i()->storeWithExpire(
                $cacheKey,
                $result,
                DateTime::ts(time() + ($status === 200 ? 43200 : 300))
            );
        } catch (\Throwable $ignored) {
            // No caching backend is required to use the application.
        }
        Output::i()->json($result, $status);
    }

    private static function providerFor(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (in_array($host, ['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am'], true)) {
            return 'instagram';
        }
        if (in_array($host, ['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'], true)) {
            return 'threads';
        }
        if (in_array($host, ['bsky.app', 'www.bsky.app'], true)) {
            return 'bluesky';
        }
        return 'facebook';
    }

    private static function endpointFor(string $url): ?string
    {
        if (strlen($url) > 2048 || !filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }
        $parts = parse_url($url);
        if (!is_array($parts) || strtolower($parts['scheme'] ?? '') !== 'https'
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
            return null;
        }
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '/';
        if (preg_match('/[\\x00-\\x1F\\x7F]/', $url)) {
            return null;
        }
        if (in_array($host, ['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am'], true)) {
            if (!preg_match('~^/(?:[A-Za-z0-9_.]+/)?(p|reel|tv)/([A-Za-z0-9_-]+)/?$~D', $path, $instagramMatch)) {
                return null;
            }
            // Instagram shares may now include /username/reel/ID or /username/p/ID.
            // Normalize them to the stable canonical permalink before calling Meta.
            $url = 'https://www.instagram.com/' . $instagramMatch[1] . '/' . $instagramMatch[2] . '/';
            $api = 'https://graph.facebook.com/v25.0/instagram_oembed';
        } elseif (in_array($host, ['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'], true)) {
            if (!preg_match('~^/(?:@[A-Za-z0-9_.]+/post/[A-Za-z0-9_-]+|t/[A-Za-z0-9_-]+)/?$~D', $path)) {
                return null;
            }
            $api = 'https://graph.threads.com/oembed';
        } elseif (in_array($host, ['bsky.app', 'www.bsky.app'], true)) {
            if (!preg_match('~^/profile/(?:[A-Za-z0-9.-]+|did:plc:[a-z2-7]+)/post/[A-Za-z0-9]+/?$~D', $path)) {
                return null;
            }
            return 'https://embed.bsky.app/oembed?url=' . rawurlencode($url) . '&maxwidth=600';
        } elseif (in_array($host, ['facebook.com', 'www.facebook.com', 'm.facebook.com'], true)) {
            if (preg_match('~^/(?:reel|watch)/~', $path) || str_contains($path, '/videos/')) {
                $api = 'https://graph.facebook.com/v25.0/oembed_video';
            } elseif (str_contains($path, '/posts/') || in_array($path, ['/story.php', '/permalink.php'], true)) {
                $api = 'https://graph.facebook.com/v25.0/oembed_post';
            } else {
                return null;
            }
        } else {
            return null;
        }
        return $api . '?url=' . rawurlencode($url) . '&omitscript=false';
    }
}
