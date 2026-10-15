<?php
/**
 * @brief		Statistics Chart Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/

 * @since		26 Jan 2023
 */

namespace IPS\core\extensions\core\Statistics;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\Db;
use IPS\Helpers\Chart;
use IPS\Helpers\Chart\Database;
use IPS\Http\Url;
use IPS\Lang;
use IPS\Member;
use OutOfRangeException;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Statistics Chart Extension
 */
class Language extends \IPS\core\Statistics\Chart
{
	/**
	 * @brief	Controller
	 */
	public ?string $controller = 'core_stats_preferences_theme';
	
	/**
	 * Render Chart
	 *
	 * @param	Url	$url	URL the chart is being shown on.
	 * @return Chart
	 */
	public function getChart( Url $url ): Chart
	{
		$chart = new Database( $url, 'core_members', 'language', '', [
		'isStacked'       => FALSE,
		'backgroundColor' => '#ffffff',
		'colors'          => ['#10967e', '#ea7963', '#de6470', '#6b9dde', '#b09be4', '#eec766', '#9fc973', '#e291bf', '#55c1a6', '#5fb9da'],
		'hAxis'           => ['gridlines' => ['color' => '#f5f5f5']],
		'lineWidth'       => 1,
		'areaOpacity'     => 0.4
		],
							   'PieChart',
							   'monthly',
							   ['start' => 0, 'end' => 0],
							   [],
							   'language'
		);
		$chart->where = ['language > ?', 0];
		$chart->groupBy = 'language';

		foreach( \IPS\Lang::languages() as $id => $language )
		{
			$chart->addSeries( $language->_title, 'number', 'count(*)', TRUE, $id );
		}

		$chart->title = Member::loggedIn()->language()->addToStack( 'stats_language_title' );
		$chart->availableTypes = ['PieChart'];

		return $chart;
	}
}