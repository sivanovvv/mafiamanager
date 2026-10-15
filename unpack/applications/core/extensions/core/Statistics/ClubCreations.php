<?php
/**
 * @brief		Statistics Chart Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/

 * @since		05 Feb 2026
 */

namespace IPS\core\extensions\core\Statistics;

use IPS\core\Statistics\Chart;
use IPS\Helpers\Chart as ChartClass;
use IPS\Helpers\Chart\Database;
use IPS\Http\Url;
use IPS\Member;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Statistics Chart Extension
 */
class ClubCreations extends Chart
{
	/**
	 * @brief	Controller
	 */
	public ?string $controller = 'core_club_creations';
	
	/**
	 * Render Chart
	 *
	 * @param   Url	$url	URL the chart is being shown on.
	 * @return ChartClass
	 */
	public function getChart( Url $url ): ChartClass
	{
		$chart	= new Database( $url, 'core_clubs', 'created', '', array(
			'isStacked' => FALSE,
			'backgroundColor' 	=> '#ffffff',
			'colors'			=> array( '#10967e' ),
			'hAxis'				=> array( 'gridlines' => array( 'color' => '#f5f5f5' ) ),
			'lineWidth'			=> 1,
			'areaOpacity'		=> 0.4
		), 'ColumnChart', 'monthly', array( 'start' => 0, 'end' => 0 ), array(), 'signups' );

		$chart->setExtension( $this );
		$chart->addSeries( Member::loggedIn()->language()->addToStack('stats_clubs_creations'), 'number', 'COUNT(*)', FALSE );
		$chart->title = Member::loggedIn()->language()->addToStack('stats_clubs_creations');
		$chart->availableTypes = array( 'ColumnChart', 'BarChart' );

		return $chart;
	}
}