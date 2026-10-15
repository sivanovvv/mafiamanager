<?php
/**
 * @brief		Support Subscriptions in sitemaps
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @subpackage	Commerce
 * @since		09 Mar 2026
 */

namespace IPS\nexus\extensions\core\Sitemap;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\Db;
use IPS\Extensions\SitemapAbstract;
use IPS\Helpers\Form\Number;
use IPS\Helpers\Form\Select;
use IPS\Helpers\Form\YesNo;
use IPS\Member;
use IPS\nexus\Subscription\Package;
use IPS\Patterns\ActiveRecordIterator;
use IPS\Settings;
use IPS\Sitemap;
use UnderflowException;
use function defined;
use const IPS\SITEMAP_MAX_PER_FILE;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Support Subscriptions in sitemaps
 */
class Subscriptions extends SitemapAbstract
{
	/**
	 * @brief	Recommended Settings
	 */
	public array $recommendedSettings = array(
		'sitemap_subscription_include' => true,
		'sitemap_subscription_count' => -1,
		'sitemap_subscription_priority' => 1
	);

	/**
	 * Add settings for ACP configuration to the form
	 *
	 * @return	array
	 */
	public function settings(): array
	{
		$settings = Settings::i()->sitemap_subscription_settings ? json_decode( Settings::i()->sitemap_subscription_settings, TRUE ) : array();
		$return = array();

		$countToInclude = $settings["sitemap_subscription_count"] ?? (string) $this->recommendedSettings["sitemap_subscription_count"];
		$return["sitemap_subscription_include"] = new YesNo( "sitemap_subscription_include", $countToInclude != 0, FALSE, array( 'togglesOn' => array( "sitemap_subscription_count", "sitemap_subscription_priority" ) ), NULL, NULL, NULL, "sitemap_subscription_include" );
		$return["sitemap_subscription_include"]->label = Member::loggedIn()->language()->addToStack( 'sitemap_include_generic_desc' );
		$return["sitemap_subscription_count"]	 = new Number( "sitemap_subscription_count", $countToInclude, FALSE, array( 'min' => '-1', 'unlimited' => '-1' ), NULL, NULL, NULL, "sitemap_subscription_count" );
		$return["sitemap_subscription_count"]->label	= Member::loggedIn()->language()->addToStack( 'sitemap_number_generic' );
		$return["sitemap_subscription_priority"] = new Select( "sitemap_subscription_priority", $settings["sitemap_subscription_priority"] ?? $this->recommendedSettings["sitemap_subscription_priority"], FALSE, array( 'options' => Sitemap::$priorities, 'unlimited' => '-1', 'unlimitedLang' => 'sitemap_dont_include' ), NULL, NULL, NULL, "sitemap_subscription_priority" );
		$return["sitemap_subscription_priority"]->label	= Member::loggedIn()->language()->addToStack( 'sitemap_priority_generic' );

		return $return;
	}

	/**
	 * Save settings for ACP configuration
	 *
	 * @param	array	$values	Values
	 * @return	void
	 */
	public function saveSettings( array $values ) : void
	{
		if ( $values['sitemap_configuration_info'] )
		{
			// Store default  values for any settings you define
			Settings::i()->changeValues( array( 'sitemap_subscription_settings' => json_encode( array() ) ) );
		}
		else
		{
			// Store the actual submitted value for any settings you define, from the $values array
			$settings = Settings::i()->sitemap_subscription_settings ? json_decode( Settings::i()->sitemap_subscription_settings, TRUE ) : array();
			$settings['sitemap_subscription_count'] = $values['sitemap_subscription_include'] ? $values['sitemap_subscription_count'] : 0;
			$settings['sitemap_subscription_priority'] = $values['sitemap_subscription_priority'];
			Settings::i()->changeValues( array( 'sitemap_subscription_settings' => json_encode( $settings ) ) );
		}
	}

	/**
	 * Get the sitemap filename(s)
	 *
	 * @return	array
	 */
	public function getFilenames(): array
	{
		$settings = Settings::i()->sitemap_subscription_settings ? json_decode( Settings::i()->sitemap_subscription_settings, TRUE ) : array();
		$limit = $settings['sitemap_subscription_count'] ?? -1;
		if( $limit == 0 )
		{
			return array();
		}

		$visiblePackages = Package::roots( 'view', new Member );
		$files  = array();
		$count = ceil( count( $visiblePackages ) / SITEMAP_MAX_PER_FILE );

		for( $i=1; $i <= $count; $i++ )
		{
			$files[] = 'sitemap_subscriptions_' . $i;
		}

		return $files;
	}

	/**
	 * Generate the sitemap
	 *
	 * @param	string			$filename	The sitemap file to build (should be one returned from getFilenames())
	 * @param	Sitemap	$sitemap	Sitemap object reference
	 * @return	int|null
	 */
	public function generateSitemap( string $filename, Sitemap $sitemap ): ?int
	{
		$entries	= array();
		$lastId		= 0;
		$settings = Settings::i()->sitemap_subscription_settings ? json_decode( Settings::i()->sitemap_subscription_settings, TRUE ) : array();

		$exploded	= explode( '_', $filename );
		$block		= (int) array_pop( $exploded );
		$totalLimit = $settings["sitemap_subscription_count"] ?? -1;
		$offset		= ( $block - 1 ) * SITEMAP_MAX_PER_FILE;
		$limit		= SITEMAP_MAX_PER_FILE;

		if ( ! $totalLimit )
		{
			return null;
		}

		if ( $totalLimit > -1 and ( $offset + $limit ) > $totalLimit )
		{
			$limit = $totalLimit - $offset;
		}

		/* Create limit clause */
		$limitClause	= array( $offset, $limit );

		$where = [];
		try
		{
			$lastId = Db::i()->select( 'last_id', 'core_sitemap', array( array( 'sitemap=?', implode( '_', $exploded ) . '_' . ( $block - 1 ) ) ) )->first();
			if( $lastId > 0 )
			{
				$where[] = array( 'id > ?', $lastId );
				$limitClause	= $limit;
			}
		}
		catch( UnderflowException ){}

		foreach( new ActiveRecordIterator(
			Db::i()->select( '*', 'nexus_member_subscription_packages', $where, null, $limitClause ),
			Package::class
				 ) as $subscription )
		{
			if( !$subscription->canView( new Member ) )
			{
				continue;
			}

			$data = array(
				'url' => $subscription->url()
			);

			$priority = $settings['sitemap_subscription_priority'] ?? 1;
			if ( $priority !== -1 )
			{
				$data['priority'] = $priority;
			}

			$entries[] = $data;

			$lastId = $subscription->id;
		}

		$sitemap->buildSitemapFile( $filename, $entries, $lastId );
		return $lastId;
	}

}